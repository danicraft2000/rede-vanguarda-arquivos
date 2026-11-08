// Planta ilustrativa do Espaço Armazém (medidas em metros; x = largura, z = profundidade, +z = rua).
// Layout proposto para a festa — adaptável ao espaço real (2 salões, segundo o próprio espaço).
export const LOTE = { x0: -30, x1: 30, z0: -21, z1: 26 };
export const PREDIO = { x0: -24, x1: 24, z0: -20, z1: 12 };

export const ZONAS = {
  lote:           { x0: -30, x1: 30, z0: -21, z1: 26, cor: '#ffffff', nome: 'Espaço Armazém' },
  estacionamento: { x0: -30, x1: 30, z0: 13, z1: 23, cor: '#27b3d6', nome: 'Estacionamento' },
  entrada:        { x0: -4, x1: 4, z0: 4, z1: 12, cor: '#f2d33a', nome: 'Entrada' },
  sala:           { x0: -16, x1: -4, z0: 4, z1: 12, cor: '#f5a12e', nome: 'Sala de Estar' },
  banheiros:      { x0: -24, x1: -16, z0: 4, z1: 12, cor: '#9bd23a', nome: '4 Banheiros' },
  salao:          { x0: -24, x1: 8, z0: -20, z1: 4, cor: '#3d6ff0', nome: 'Salão Principal' },
  palco:          { x0: -14, x1: 2, z0: -20, z1: -15, cor: '#7b3fe0', nome: 'Palco · 3 Telões' },
  mesas:          { x0: -14, x1: 1, z0: -13, z1: 2, cor: '#2fc27a', nome: 'Mesas' },
  buffet:         { x0: 2.5, x1: 8, z0: -14, z1: 2, cor: '#e5342e', nome: 'Buffet' },
  gamer:          { x0: -24, x1: -16.5, z0: -14, z1: -5, cor: '#d6247e', nome: 'Área Gamer' },
  playground:     { x0: -24, x1: -16.5, z0: -4, z1: 3, cor: '#f26b2a', nome: 'Playground' },
  museu:          { x0: 8, x1: 24, z0: -3, z1: 12, cor: '#27b3d6', nome: 'Museu Vanguarda' },
  estudios:       { x0: 8, x1: 24, z0: -20, z1: -3, cor: '#9bd23a', nome: 'Estúdios' },
};
