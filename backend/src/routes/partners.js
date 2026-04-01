const express = require('express');
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const { User, Venue, Court, Slot, Match, AvailabilityRule, AvailabilityException, CourtClosure } = require('../models');
const auth = require('../middleware/auth');
const {
    parseTimeToMinutes,
    formatMinutes,
    normalizeWindows,
    normalizeRules,
    parseDateOnly,
    dateToStr,
    todayDateStr,
    ensureSlotsForRange,
} = require('../services/availability');
const { emitVenueAvailabilityUpdate } = require('../services/realtime');
const {
    normalizeVenueServices,
    normalizeCourtSurface,
    normalizeCourtEnclosure,
} = require('../constants/venueFilters');

const router = express.Router();

const venueImageStorage = multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `venue_${req.user.id}_${Date.now()}${ext}`);
    },
});
const uploadVenueImage = multer({ storage: venueImageStorage, limits: { fileSize: 5 * 1024 * 1024 } });

async function getManagedVenue(userId) {
    return Venue.findOne({ where: { manager_id: userId } });
}

router.post('/onboarding', auth, async (req, res) => {
    try {
        const {
            venue_name,
            venue_address,
            venue_phone,
            court_count,
            newPassword
        } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const venue = await Venue.create({
            name: venue_name,
            address: venue_address,
            phone: venue_phone || '',
            price_per_slot: 0,
            services: [],
            manager_id: user.id
        });

        const count = parseInt(court_count, 10) || 1;
        const courts = [];
        for (let i = 1; i <= count; i++) {
            courts.push({
                venue_id: venue.id,
                name: `Cancha ${i}`,
                type: i === 1 ? 'Cristal' : 'Muro',
                surface: null,
                enclosure: null
            });
        }
        await Court.bulkCreate(courts);

        if (newPassword) {
            user.password = newPassword;
            await user.save();
        }

        res.status(201).json({
            message: 'Onboarding completado con exito',
            venue,
            court_count: count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error durante el onboarding' });
    }
});

router.get('/venue', auth, async (req, res) => {
    try {
        const venue = await Venue.findOne({
            where: { manager_id: req.user.id },
            include: [{ model: Court }]
        });

        if (!venue) return res.status(404).json({ error: 'No se encontro sede para este usuario' });

        emitVenueAvailabilityUpdate({ venueId: venue.id, reason: 'venue_updated' });
        res.json({ venue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo datos de la sede' });
    }
});

router.put('/venue', auth, async (req, res) => {
    try {
        const venue = await Venue.findOne({ where: { manager_id: req.user.id } });
        if (!venue) return res.status(404).json({ error: 'No se encontro sede para este usuario' });

        const { name, address, phone, image, price_per_slot, services } = req.body;

        const normalizedPricePerSlot = price_per_slot !== undefined
            ? Math.max(0, Number(price_per_slot) || 0)
            : venue.price_per_slot;
        const normalizedServices = services !== undefined
            ? normalizeVenueServices(services)
            : (Array.isArray(venue.services) ? venue.services : []);

        await venue.update({
            name: (name || '').trim() || venue.name,
            address: address !== undefined ? String(address).trim() : venue.address,
            phone: phone !== undefined ? String(phone).trim() : venue.phone,
            price_per_slot: normalizedPricePerSlot,
            image: image !== undefined ? String(image).trim() : venue.image,
            services: normalizedServices,
        });

        const courts = await Court.findAll({
            where: { venue_id: venue.id },
            attributes: ['id']
        });

        if (courts.length > 0) {
            await Slot.update(
                { price: normalizedPricePerSlot },
                {
                    where: {
                        court_id: { [Op.in]: courts.map((court) => court.id) },
                        date: { [Op.gte]: todayDateStr() },
                        is_available: true,
                        booked_externally: false
                    }
                }
            );
        }

        res.json({ venue });
    } catch (err) {
        if (err.status === 400) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Error actualizando datos de la sede' });
    }
});

router.post('/venue/image', auth, uploadVenueImage.single('image'), async (req, res) => {
    try {
        const venue = await Venue.findOne({ where: { manager_id: req.user.id } });
        if (!venue) return res.status(404).json({ error: 'No se encontro sede para este usuario' });
        if (!req.file) return res.status(400).json({ error: 'No se envio ninguna imagen' });

        const imageUrl = `/uploads/${req.file.filename}`;
        await venue.update({ image: imageUrl });

        res.json({ image: imageUrl, venue });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error subiendo imagen de la sede' });
    }
});

router.get('/slots', auth, async (req, res) => {
    try {
        const venue = await getManagedVenue(req.user.id);
        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });

        const from = req.query.from || todayDateStr();
        const toDate = parseDateOnly(from);
        const days = Math.max(1, Math.min(parseInt(req.query.days || '14', 10) || 14, 90));
        toDate.setDate(toDate.getDate() + days - 1);
        const to = req.query.to || dateToStr(toDate);

        await ensureSlotsForRange(venue.id, from, to);

        const slots = await Slot.findAll({
            include: [{
                model: Court,
                where: { venue_id: venue.id },
                attributes: ['id', 'name', 'type', 'surface', 'enclosure']
            }],
            where: {
                date: {
                    [Op.between]: [from, to]
                }
            },
            order: [
                [Court, 'name', 'ASC'],
                ['date', 'ASC'],
                ['time', 'ASC']
            ]
        });

        res.json({ slots });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo turnos de la sede' });
    }
});

router.get('/availability-rules', auth, async (req, res) => {
    try {
        const venue = await getManagedVenue(req.user.id);
        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });

        const rules = await AvailabilityRule.findAll({
            where: {
                venue_id: venue.id,
                is_active: true
            },
            order: [['id', 'ASC']]
        });

        res.json({
            rules,
            court_ids: [...new Set(rules.flatMap((rule) => Array.isArray(rule.court_ids) ? rule.court_ids : []))],
            from: rules.length ? rules.map((rule) => rule.start_date).sort()[0] : null,
            to: rules.length ? rules.map((rule) => rule.end_date).sort().slice(-1)[0] : null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo reglas de disponibilidad' });
    }
});

router.put('/availability-rules', auth, async (req, res) => {
    try {
        const { court_ids, rules, from, to } = req.body;
        const venue = await getManagedVenue(req.user.id);

        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });
        if (!Array.isArray(court_ids) || court_ids.length === 0) {
            return res.status(400).json({ error: 'Debes seleccionar al menos una cancha' });
        }

        const normalizedRules = normalizeRules({ rules });
        if (normalizedRules.length === 0) {
            return res.status(400).json({ error: 'Debes definir al menos una regla semanal con dias y horarios' });
        }

        const startDate = from || todayDateStr();
        const endDate = to || dateToStr(new Date(new Date().getFullYear(), 11, 31));

        await Slot.destroy({
            where: {
                court_id: { [Op.in]: court_ids },
                date: { [Op.between]: [startDate, endDate] },
                is_available: true,
                booked_externally: false
            }
        });

        await AvailabilityRule.destroy({ where: { venue_id: venue.id } });

        const createdRules = [];
        for (const rule of normalizedRules) {
            createdRules.push(await AvailabilityRule.create({
                venue_id: venue.id,
                court_ids,
                weekdays: rule.weekdays,
                windows: rule.windows,
                start_date: startDate,
                end_date: endDate,
                is_active: true,
            }));
        }

        emitVenueAvailabilityUpdate({ venueId: venue.id, reason: 'availability_rules_updated' });
        res.json({
            message: 'Disponibilidad guardada',
            rules: createdRules
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando reglas de disponibilidad' });
    }
});

router.get('/availability-exceptions', auth, async (req, res) => {
    try {
        const venue = await getManagedVenue(req.user.id);
        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });

        const from = req.query.from || todayDateStr();
        const to = req.query.to || from;

        const exceptions = await AvailabilityException.findAll({
            where: {
                venue_id: venue.id,
                court_id: null,
                date: { [Op.between]: [from, to] }
            },
            order: [['date', 'ASC']]
        });

        res.json({ exceptions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo excepciones de disponibilidad' });
    }
});

router.put('/availability-exceptions', auth, async (req, res) => {
    try {
        const { date, windows = [] } = req.body;
        const venue = await getManagedVenue(req.user.id);

        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });
        if (!date) return res.status(400).json({ error: 'Debes enviar la fecha' });

        const [exception] = await AvailabilityException.findOrCreate({
            where: {
                venue_id: venue.id,
                court_id: null,
                date
            },
            defaults: {
                venue_id: venue.id,
                court_id: null,
                date,
                windows: []
            }
        });

        await exception.update({
            windows: normalizeWindows({ windows }),
            is_closed: false
        });

        const courtIds = (await Court.findAll({
            where: { venue_id: venue.id },
            attributes: ['id']
        })).map((court) => court.id);

        await Slot.destroy({
            where: {
                court_id: { [Op.in]: courtIds },
                date,
                is_available: true,
                booked_externally: false
            }
        });

        await ensureSlotsForRange(venue.id, date, date);

        emitVenueAvailabilityUpdate({ venueId: venue.id, date, reason: 'availability_exception_updated' });
        res.json({
            message: 'Disponibilidad diaria guardada',
            exception
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando excepcion diaria' });
    }
});

router.get('/court-closures', auth, async (req, res) => {
    try {
        const venue = await getManagedVenue(req.user.id);
        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });

        const from = req.query.from || todayDateStr();
        const to = req.query.to || from;

        const closures = await CourtClosure.findAll({
            where: {
                venue_id: venue.id,
                start_date: { [Op.lte]: to },
                end_date: { [Op.gte]: from }
            },
            include: [{ model: Court, attributes: ['id', 'name', 'type', 'surface', 'enclosure'] }],
            order: [['start_date', 'ASC'], ['end_date', 'ASC']]
        });

        res.json({ closures });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo clausuras de canchas' });
    }
});

router.post('/court-closures', auth, async (req, res) => {
    try {
        const { court_id, start_date, end_date, reason } = req.body;
        const venue = await getManagedVenue(req.user.id);

        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });
        if (!court_id || !start_date || !end_date) {
            return res.status(400).json({ error: 'Debes enviar cancha, fecha de inicio y fecha de fin' });
        }
        if (start_date > end_date) {
            return res.status(400).json({ error: 'La fecha de fin no puede ser anterior al inicio' });
        }

        const court = await Court.findOne({ where: { id: court_id, venue_id: venue.id } });
        if (!court) return res.status(404).json({ error: 'Cancha no encontrada para esta sede' });

        await CourtClosure.destroy({
            where: {
                venue_id: venue.id,
                court_id,
                start_date: { [Op.lte]: end_date },
                end_date: { [Op.gte]: start_date }
            }
        });

        const closure = await CourtClosure.create({
            venue_id: venue.id,
            court_id,
            start_date,
            end_date,
            reason: reason?.trim() || null
        });

        await Slot.destroy({
            where: {
                court_id,
                date: { [Op.between]: [start_date, end_date] },
                is_available: true,
                booked_externally: false
            }
        });

        emitVenueAvailabilityUpdate({ venueId: venue.id, reason: 'court_closure_created' });
        res.status(201).json({
            message: 'Clausura guardada',
            closure
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error guardando clausura de cancha' });
    }
});

router.delete('/court-closures/:id', auth, async (req, res) => {
    try {
        const venue = await getManagedVenue(req.user.id);
        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });

        const closure = await CourtClosure.findOne({
            where: {
                id: req.params.id,
                venue_id: venue.id
            }
        });

        if (!closure) return res.status(404).json({ error: 'Clausura no encontrada' });

        await closure.destroy();
        await ensureSlotsForRange(venue.id, closure.start_date, closure.end_date);

        emitVenueAvailabilityUpdate({ venueId: venue.id, reason: 'court_closure_removed' });
        res.json({ message: 'Clausura eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error eliminando clausura de cancha' });
    }
});

router.post('/courts', auth, async (req, res) => {
    try {
        const { name, type, image, surface, enclosure } = req.body;
        const venue = await Venue.findOne({ where: { manager_id: req.user.id } });

        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });
        if (!String(name || '').trim()) {
            return res.status(400).json({ error: 'Debes indicar un nombre para la cancha' });
        }

        const court = await Court.create({
            venue_id: venue.id,
            name: String(name).trim(),
            type: String(type || '').trim() || 'Cristal',
            image: image !== undefined ? String(image).trim() : null,
            surface: normalizeCourtSurface(surface),
            enclosure: normalizeCourtEnclosure(enclosure),
        });

        emitVenueAvailabilityUpdate({ venueId: venue.id, reason: 'court_created' });
        res.status(201).json({ court });
    } catch (err) {
        if (err.status === 400) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Error creando cancha' });
    }
});

router.put('/courts/:id', auth, async (req, res) => {
    try {
        const venue = await Venue.findOne({ where: { manager_id: req.user.id } });
        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });

        const court = await Court.findOne({
            where: {
                id: req.params.id,
                venue_id: venue.id,
            }
        });
        if (!court) return res.status(404).json({ error: 'Cancha no encontrada' });

        const { name, type, image, surface, enclosure } = req.body;
        const nextName = String(name !== undefined ? name : court.name || '').trim();
        if (!nextName) {
            return res.status(400).json({ error: 'Debes indicar un nombre para la cancha' });
        }

        await court.update({
            name: nextName,
            type: String(type !== undefined ? type : court.type || '').trim() || 'Cristal',
            image: image !== undefined ? String(image).trim() : court.image,
            surface: normalizeCourtSurface(surface !== undefined ? surface : court.surface),
            enclosure: normalizeCourtEnclosure(enclosure !== undefined ? enclosure : court.enclosure),
        });

        emitVenueAvailabilityUpdate({ venueId: venue.id, reason: 'court_updated' });
        res.json({ court });
    } catch (err) {
        if (err.status === 400) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        res.status(500).json({ error: 'Error actualizando cancha' });
    }
});

router.post('/slots/generate', auth, async (req, res) => {
    try {
        const { court_ids, weekdays, start_time, end_time, windows, rules, from, to, days = 14 } = req.body;
        const venue = await getManagedVenue(req.user.id);

        if (!venue) return res.status(403).json({ error: 'No autorizado o sede no encontrada' });
        if (!Array.isArray(court_ids) || court_ids.length === 0) {
            return res.status(400).json({ error: 'Debes seleccionar al menos una cancha' });
        }
        const duration = 90;
        const normalizedRules = normalizeRules({ rules, weekdays, windows, start_time, end_time });
        if (normalizedRules.length === 0) {
            return res.status(400).json({ error: 'Debes definir al menos una regla semanal con dias y horarios' });
        }

        const parsedRules = normalizedRules.map((rule) => ({
            weekdays: rule.weekdays
                .map((day) => parseInt(day, 10))
                .filter((day) => day >= 0 && day <= 6),
            windows: rule.windows.map((window) => {
                const startMinutes = parseTimeToMinutes(window.start_time);
                const endMinutes = parseTimeToMinutes(window.end_time);

                if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
                    throw new Error('Rango horario invalido');
                }
                if (endMinutes - startMinutes < duration) {
                    throw new Error('Cada rango debe permitir al menos un turno de 90 minutos');
                }

                return { startMinutes, endMinutes };
            })
        })).filter((rule) => rule.weekdays.length > 0 && rule.windows.length > 0);

        if (parsedRules.length === 0) {
            return res.status(400).json({ error: 'Debes definir al menos una regla semanal valida' });
        }

        const courts = await Court.findAll({
            where: {
                id: { [Op.in]: court_ids },
                venue_id: venue.id
            }
        });

        if (courts.length === 0) {
            return res.status(400).json({ error: 'No se encontraron canchas validas para esta sede' });
        }

        const startDate = parseDateOnly(from || todayDateStr());
        const fallbackTo = new Date(startDate);
        fallbackTo.setFullYear(fallbackTo.getFullYear(), 11, 31);
        const endDate = to ? parseDateOnly(to) : fallbackTo;
        const totalDays = endDate
            ? Math.max(1, Math.min(Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1, 366))
            : Math.max(1, Math.min(parseInt(days, 10) || 14, 366));
        const generated = [];
        const skipped = [];

        for (let offset = 0; offset < totalDays; offset++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + offset);

            const dateStr = dateToStr(currentDate);
            const matchingRules = parsedRules.filter((rule) => rule.weekdays.includes(currentDate.getDay()));
            if (matchingRules.length === 0) continue;

            for (const court of courts) {
                for (const rule of matchingRules) {
                    for (const window of rule.windows) {
                        for (let minutes = window.startMinutes; minutes + duration <= window.endMinutes; minutes += duration) {
                            const time = formatMinutes(minutes);
                            const [slot, created] = await Slot.findOrCreate({
                                where: {
                                    court_id: court.id,
                                    date: dateStr,
                                    time
                                },
                                defaults: {
                                    court_id: court.id,
                                    date: dateStr,
                                    time,
                                    duration,
                                    price: Number(venue.price_per_slot || 0),
                                    is_available: true
                                }
                            });

                            if (created) generated.push(slot);
                            else skipped.push({ court_id: court.id, date: dateStr, time });
                        }
                    }
                }
            }
        }

        emitVenueAvailabilityUpdate({ venueId: venue.id, reason: 'slots_generated' });
        res.status(201).json({
            created: generated.length,
            skipped: skipped.length,
            first_date: generated[0]?.date || null,
            last_date: generated[generated.length - 1]?.date || null,
            slots: generated
        });
    } catch (err) {
        console.error(err);
        if (err.message === 'Rango horario invalido' || err.message === 'Cada rango debe permitir al menos un turno de 90 minutos') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Error generando turnos' });
    }
});

router.put('/slots/:id/occupy', auth, async (req, res) => {
    try {
        const { occupant_name, occupant_phone, notes } = req.body;
        const slot = await Slot.findByPk(req.params.id);

        if (!slot) return res.status(404).json({ error: 'Turno no encontrado' });
        if (!slot.is_available) return res.status(400).json({ error: 'El turno ya no esta disponible' });

        const activeMatch = await Match.findOne({
            where: {
                slot_id: slot.id,
                status: { [Op.in]: ['open', 'reserved'] }
            }
        });
        if (activeMatch) return res.status(400).json({ error: 'El turno ya esta siendo usado por la app' });

        await slot.update({
            is_available: false,
            booked_externally: true,
            occupant_name,
            occupant_phone,
            notes
        });

        const court = await Court.findByPk(slot.court_id, { attributes: ['venue_id'] });
        emitVenueAvailabilityUpdate({ venueId: court?.venue_id, date: slot.date, reason: 'slot_occupied_externally' });
        res.json({ slot });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error ocupando turno' });
    }
});

router.get('/all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

        const partners = await User.findAll({
            where: { role: 'partner' },
            include: [{ model: Venue, as: 'ManagedVenues' }],
            attributes: { exclude: ['password'] }
        });

        res.json({ partners });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error listando socios' });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'Socio no encontrado' });

        await user.update({ role: 'player' });

        res.json({ message: 'Socio desvinculado con exito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error eliminando socio' });
    }
});

router.post('/create', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

        const { name, email } = req.body;
        const password = 'Partner' + Math.floor(1000 + Math.random() * 9000);
        const user = await User.create({
            name,
            email,
            password,
            role: 'partner'
        });

        res.status(201).json({
            message: 'Manager creado con exito',
            partner: { ...user.toJSON() },
            temporaryPassword: password
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creando partner' });
    }
});

module.exports = router;
