// Planta do Espaço Armazém (metros). Rua em +Z, fundo do terreno em -Z.
export const L = {
  bx0: -24, bx1: 44, bz0: -32, bz1: 20, wallH: 7.5,          // prédio
  park: { x0: -26, x1: 46, z0: 20, z1: 40 },                  // estacionamento
  gate: { x0: -4, x1: 4, z: 40 },
  portico: { x0: -3.6, x1: 3.6, z0: 20, z1: 23, h: 6.6 },
  foyer: { x0: -5, x1: 5, z0: 11, z1: 20 },                   // entrada (presentes e lembrancinhas)
  lounge: { x0: -24, x1: -5, z0: 11, z1: 20 },                // corredor / sala de estar + Vanguarda Especial
  baths: { x0: 5, x1: 20, z0: 11, z1: 20, hallZ: 14 },        // 4 banheiros
  kids: { x0: 18, x1: 44, z0: 8, z1: 20 },                    // playground
  hall: { x0: -24, x1: 18, z0: -32, z1: 11 },                 // salão principal
  museum: { x0: 18, x1: 44, z0: -32, z1: 8 },                 // salão secundário (museu)
  stage: { x0: -11, x1: 11, z0: -32, z1: -25, h: 1.0 },
};
