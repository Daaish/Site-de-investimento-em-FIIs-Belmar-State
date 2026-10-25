CREATE TABLE belmar.usuarios (
  id UUID PRIMARY KEY,
  nome VARCHAR(120) NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 2 AND 120),
  email VARCHAR(254) NOT NULL CHECK (email = lower(btrim(email))),
  senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT usuarios_email_unico UNIQUE (email)
);

CREATE TABLE belmar.carteiras (
  id UUID PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES belmar.usuarios(id) ON DELETE RESTRICT,
  nome VARCHAR(120) NOT NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT carteiras_usuario_unico UNIQUE (usuario_id)
);

CREATE TABLE belmar.operacoes (
  id UUID PRIMARY KEY,
  carteira_id UUID NOT NULL REFERENCES belmar.carteiras(id) ON DELETE RESTRICT,
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venda')),
  ticker VARCHAR(12) NOT NULL CHECK (ticker ~ '^[A-Z0-9]{5,12}$'),
  quantidade BIGINT NOT NULL CHECK (quantidade BETWEEN 1 AND 9007199254740991),
  preco NUMERIC NOT NULL CHECK (preco > 0 AND preco < 'Infinity'::numeric),
  data DATE NOT NULL,
  ordem BIGINT NOT NULL CHECK (ordem BETWEEN 0 AND 9007199254740991),
  origem_local_id TEXT,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (carteira_id, ordem),
  UNIQUE (carteira_id, origem_local_id)
);
