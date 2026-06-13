const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { starsFromSelfCategory, categoryFromStars } = require('../services/elo');
const auth = require('../middleware/auth');
const { buildCanonicalUserPayload } = require('../services/competitive/userContracts');
const { AccountDeletionError, deleteAccountForUser } = require('../services/accountDeletion');
const {
  SocialAuthError,
  issueAuthToken,
  findOrCreateSocialUser,
  verifyGoogleIdentityToken,
  verifyAppleIdentityToken,
} = require('../services/socialAuth');
const {
  PhoneAuthError,
  normalizePhoneNumber,
  sendPhoneVerification,
  checkPhoneVerification,
} = require('../services/phoneAuth');

const router = express.Router();

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      name,
      self_category = 'principiante',
      paddle_brand,
      position
    } = req.body;
    const normalizedEmail = normalizeEmail(email);

    console.log(`[auth.register] [${req.requestId}] attempt`, {
      email: normalizedEmail || null,
      hasName: Boolean(name?.trim()),
      hasPassword: Boolean(password),
      hasConfirmPassword: typeof confirmPassword === 'string',
      selfCategory: self_category,
      position,
    });

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }

    if (typeof confirmPassword === 'string' && password !== confirmPassword) {
      console.warn(`[auth.register] [${req.requestId}] password confirmation mismatch`, {
        email: normalizedEmail || null,
      });
      return res.status(400).json({ error: 'Las contraseñas no coinciden' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      console.warn(`[auth.register] [${req.requestId}] email already registered`, {
        email: normalizedEmail,
      });
      return res.status(409).json({ error: 'El email ya esta registrado' });
    }

    const stars = starsFromSelfCategory(self_category);
    const category_tier = categoryFromStars(stars);

    const user = await User.create({
      email: normalizedEmail,
      password,
      name,
      self_category,
      category_tier,
      stars,
      paddle_brand,
      position
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`[auth.register] [${req.requestId}] user created`, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({ token, user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(`[auth.register] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    console.log(`[auth.login] [${req.requestId}] attempt`, {
      email: normalizedEmail || null,
      hasPassword: Boolean(password),
    });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      console.warn(`[auth.login] [${req.requestId}] user not found`, {
        email: normalizedEmail || null,
      });
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    if (user.deleted_at) {
      return res.status(403).json({ error: 'Esta cuenta fue eliminada' });
    }

    if (!user.password) {
      return res.status(401).json({
        error: 'Esta cuenta no tiene contrasena. Entra con telefono o agrega una desde tu perfil',
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.warn(`[auth.login] [${req.requestId}] invalid password`, {
        email: normalizedEmail,
        userId: user.id,
      });
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`[auth.login] [${req.requestId}] login success`, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ token, user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(`[auth.login] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/social/:provider', async (req, res) => {
  try {
    const { provider } = req.params;

    console.log(`[auth.social] [${req.requestId}] attempt`, {
      provider,
      hasGoogleToken: Boolean(req.body?.idToken),
      hasAppleToken: Boolean(req.body?.identityToken),
    });

    let socialProfile = null;

    if (provider === 'google') {
      socialProfile = await verifyGoogleIdentityToken(req.body?.idToken);
    } else if (provider === 'apple') {
      socialProfile = await verifyAppleIdentityToken({
        identityToken: req.body?.identityToken,
        email: req.body?.email,
        fullName: req.body?.fullName,
      });
    } else {
      return res.status(400).json({ error: 'Proveedor social no soportado' });
    }

    const user = await findOrCreateSocialUser(socialProfile);
    const token = issueAuthToken(user);

    console.log(`[auth.social] [${req.requestId}] success`, {
      provider,
      userId: user.id,
      email: user.email,
    });

    res.json({ token, user: buildCanonicalUserPayload(user) });
  } catch (err) {
    if (err instanceof SocialAuthError) {
      console.warn(`[auth.social] [${req.requestId}] rejected`, {
        provider: req.params.provider,
        message: err.message,
      });
      return res.status(err.status).json({ error: err.message });
    }

    console.error(`[auth.social] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/phone/send-code', async (req, res) => {
  try {
    const { phone } = req.body || {};

    console.log(`[auth.phone.send] [${req.requestId}] attempt`, {
      hasPhone: Boolean(phone),
    });

    const verification = await sendPhoneVerification({
      phone,
      requestIp: req.ip,
      channel: 'sms',
    });

    console.log(`[auth.phone.send] [${req.requestId}] success`, {
      phone: verification.to || null,
      status: verification.status || null,
      sid: verification.sid || null,
      isMock: Boolean(verification.isMock),
    });

    const responsePayload = {
      success: true,
      phone: verification.to || normalizePhoneNumber(phone),
      channel: verification.channel || 'sms',
      status: verification.status || 'pending',
    };

    if (process.env.NODE_ENV !== 'production' && verification.isMock) {
      responsePayload.debug_code = '123456';
    }

    res.json(responsePayload);
  } catch (err) {
    if (err instanceof PhoneAuthError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }

    console.error(`[auth.phone.send] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/phone/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body || {};

    console.log(`[auth.phone.verify] [${req.requestId}] attempt`, {
      hasPhone: Boolean(phone),
      hasCode: Boolean(code),
    });

    const verification = await checkPhoneVerification({ phone, code });
    if (!(verification.valid || verification.status === 'approved')) {
      return res.status(400).json({
        error: 'No pudimos validar el codigo. Intenta de nuevo',
        code: 'phone_code_not_approved',
      });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const now = new Date();
    let user = await User.findOne({ where: { phone_normalized: normalizedPhone } });
    let isNewUser = false;

    if (user?.deleted_at) {
      return res.status(403).json({ error: 'Esta cuenta fue eliminada' });
    }

    if (!user) {
      const selfCategory = 'principiante';
      const stars = starsFromSelfCategory(selfCategory);
      const categoryTier = categoryFromStars(stars);

      user = await User.create({
        phone: normalizedPhone,
        phone_normalized: normalizedPhone,
        phone_verified_at: now,
        self_category: selfCategory,
        category: selfCategory,
        stars,
        category_tier: categoryTier,
        role: 'player',
      });
      isNewUser = true;
    } else {
      await user.update({
        phone: normalizedPhone,
        phone_normalized: normalizedPhone,
        phone_verified_at: user.phone_verified_at || now,
      });
    }

    const token = issueAuthToken(user);

    console.log(`[auth.phone.verify] [${req.requestId}] success`, {
      userId: user.id,
      isNewUser,
      phone: normalizedPhone,
    });

    res.json({
      token,
      user: buildCanonicalUserPayload(user),
      is_new_user: isNewUser,
    });
  } catch (err) {
    if (err instanceof PhoneAuthError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }

    console.error(`[auth.phone.verify] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(`[auth.me] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/phone/complete-profile', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      self_category,
      paddle_brand,
      position,
      password,
      confirmPassword,
    } = req.body || {};

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const nextName = typeof name === 'string' ? name.trim() : '';
    if (!nextName) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail) {
      const existing = await User.findOne({ where: { email: normalizedEmail } });
      if (existing && existing.id !== user.id) {
        return res.status(409).json({ error: 'El email ya esta registrado' });
      }
    }

    if ((password || confirmPassword) && password !== confirmPassword) {
      return res.status(400).json({ error: 'Las contrasenas no coinciden' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 6 caracteres' });
    }

    const updates = {
      name: nextName,
      profile_completed_at: new Date(),
    };

    if (normalizedEmail) {
      updates.email = normalizedEmail;
    }

    if (typeof paddle_brand === 'string') {
      updates.paddle_brand = paddle_brand.trim();
    }

    if (typeof position === 'string' && position.trim()) {
      updates.position = position.trim();
    }

    if (typeof self_category === 'string' && self_category.trim()) {
      const stars = starsFromSelfCategory(self_category);
      updates.self_category = self_category.trim();
      updates.category = self_category.trim();
      updates.stars = stars;
      updates.category_tier = categoryFromStars(stars);
    }

    if (password) {
      updates.password = password;
    }

    await user.update(updates);

    res.json({ user: buildCanonicalUserPayload(user) });
  } catch (err) {
    console.error(`[auth.phone.complete-profile] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/delete-account', auth, async (req, res) => {
  try {
    if (req.body?.confirmation !== 'DELETE') {
      return res.status(400).json({
        error: 'Debes confirmar la eliminacion de la cuenta',
        code: 'account_deletion_confirmation_required',
      });
    }

    const result = await deleteAccountForUser({
      userId: req.user.id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      deleted_at: result.deletedAt,
    });
  } catch (err) {
    if (err instanceof AccountDeletionError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }

    console.error(`[auth.delete-account] [${req.requestId}] error`);
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
