const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto')
const { promisify } = require('node:util')
const derivar = promisify(scrypt)
const opcoes = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }

async function hashSenha(senha) {
  const salt = randomBytes(16).toString('hex')
  const hash = await derivar(senha, salt, 64, opcoes)
  return `scrypt$16384$8$1$${salt}$${hash.toString('hex')}`
}

async function verificarSenha(senha, armazenado) {
  const partes = typeof armazenado === 'string' ? armazenado.split('$') : []
  if (partes.length !== 6 || partes.slice(0, 4).join('$') !== 'scrypt$16384$8$1' ||
      !/^[a-f0-9]{32}$/.test(partes[4]) || !/^[a-f0-9]{128}$/.test(partes[5])) return false
  const calculado = await derivar(senha, partes[4], 64, opcoes)
  return timingSafeEqual(calculado, Buffer.from(partes[5], 'hex'))
}

// Unknown e-mails still perform a derivation, without a hard-coded password/hash.
const hashAusente = () => `scrypt$16384$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`
module.exports = { hashSenha, verificarSenha, hashAusente }
