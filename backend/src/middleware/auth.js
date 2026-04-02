const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { buildCompetitiveContext } = require('../services/competitive/legacyMapping');

async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token requerido' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(payload.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado para el token provisto' });
    }

    const userData = user.toJSON();

    req.user = {
      ...payload,
      ...userData,
      competitive_context: buildCompetitiveContext(userData),
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
