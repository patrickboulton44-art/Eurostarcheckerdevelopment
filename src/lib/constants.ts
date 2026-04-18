export const ROUTES = [
  { id: "lon-par", origin: "London", destination: "Paris", originCode: "7015400", destCode: "8727100" },
  { id: "par-lon", origin: "Paris", destination: "London", originCode: "8727100", destCode: "7015400" },
  { id: "lon-bru", origin: "London", destination: "Brussels", originCode: "7015400", destCode: "8814001" },
  { id: "bru-lon", origin: "Brussels", destination: "London", originCode: "8814001", destCode: "7015400" },
  { id: "lon-ams", origin: "London", destination: "Amsterdam", originCode: "7015400", destCode: "8400058" },
  { id: "ams-lon", origin: "Amsterdam", destination: "London", originCode: "8400058", destCode: "7015400" },
  { id: "lon-rot", origin: "London", destination: "Rotterdam", originCode: "7015400", destCode: "8400530" },
  { id: "rot-lon", origin: "Rotterdam", destination: "London", originCode: "8400530", destCode: "7015400" },
  { id: "lon-lil", origin: "London", destination: "Lille", originCode: "7015400", destCode: "8728210" },
  { id: "lil-lon", origin: "Lille", destination: "London", originCode: "8728210", destCode: "7015400" },
  { id: "par-bru", origin: "Paris", destination: "Brussels", originCode: "8727100", destCode: "8814001" },
  { id: "bru-par", origin: "Brussels", destination: "Paris", originCode: "8814001", destCode: "8727100" },
  { id: "par-ams", origin: "Paris", destination: "Amsterdam", originCode: "8727100", destCode: "8400058" },
  { id: "ams-par", origin: "Amsterdam", destination: "Paris", originCode: "8400058", destCode: "8727100" },
] as const;

export type Route = typeof ROUTES[number];
