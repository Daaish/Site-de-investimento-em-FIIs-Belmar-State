-- O recibo sobrevive à exclusão da operação: repetir um POST nunca a recria.
CREATE TABLE belmar.requisicoes_operacoes (
  carteira_id UUID NOT NULL REFERENCES belmar.carteiras(id) ON DELETE RESTRICT,
  chave UUID NOT NULL,
  dados JSONB NOT NULL,
  operacao JSONB NOT NULL,
  PRIMARY KEY (carteira_id, chave)
);
