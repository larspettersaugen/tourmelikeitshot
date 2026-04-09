/**
 * One-time script: Delete all people and replace with Chris Holsten band list.
 * Excludes "Sjåfør lastebil".
 * Run: node prisma/seed-chris-holsten-people.cjs
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseBirthdate(ddMmYyyy) {
  if (!ddMmYyyy?.trim()) return null;
  const parts = ddMmYyyy.trim().split(/[.\-/\s]/).filter(Boolean);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

function mapRoleToType(role) {
  const r = role.toLowerCase();
  if (r.includes('artist')) return 'superstar';
  if (r.includes('gitar') || r.includes('keys') || r.includes('bass') || r.includes('trommer') || r.includes('kor') || r.includes('multi')) return 'musician';
  if (r.includes('production manager')) return 'productionmanager';
  if (r.includes('tour manager') || r.includes('tm2') || r.includes('management')) return 'tour_manager';
  return 'crew';
}

const PEOPLE = [
  { role: 'Artist', firstName: 'Christoffer', lastName: 'Holsten', phone: '415 02 365', email: 'chrisholstenmusic@gmail.com', address: 'Vibesgate 25', birthdate: '04.05.1993' },
  { role: 'Gitar', firstName: 'Stefan Gracia', lastName: 'Slaaen', phone: '99 47 27 44', email: 'stephan.slaaen@gmail.com', address: 'Normannsgata 52', birthdate: '14.02.1991' },
  { role: 'Keys', firstName: 'Eirik Jonassen', lastName: 'Fjelde', phone: '481 55 132', email: 'eirikfj@gmail.com', address: 'Waldemars hage 4, 0175 Oslo', birthdate: '31.08.1990' },
  { role: 'Bass', firstName: 'Mugisho', lastName: 'Nhonzi', phone: '40 21 95 16', email: 'muginhonzi@gmail.com', address: 'Sinsenterassen 7, 0574 Oslo', birthdate: '01.04.1993' },
  { role: 'Trommer', firstName: 'Henrik', lastName: 'Langerød', phone: '41 85 14 27', email: 'henrik.langerod@gmail.com', address: 'Seilduksgata 1B, 0553 OSLO', birthdate: '01.02.1993' },
  { role: 'Multi 1', firstName: 'Runa', lastName: 'Husøy', phone: '957 70 522', email: 'runa2912@gmail.com', address: 'Fastings gate 7A, 0358 Oslo', birthdate: '29.12.1992' },
  { role: 'Kor', firstName: 'Natnael', lastName: 'Asgedom', phone: '904 789 34', email: 'natnael.asgedom@gmail.com', address: 'Turbinveien 3, 0195 Oslo', birthdate: '' },
  { role: 'Kor', firstName: 'Malin Joneid', lastName: 'Ellefsen', phone: '995 57 291', email: 'malin.joneid@gmail.com', address: 'Vestagløtt 3, 1719 Greåker', birthdate: '13.06.1994' },
  { role: 'Lyd', firstName: 'Henning Daniel', lastName: 'Fjeld', phone: '988 30 651', email: 'fieldlyd@gmail.com', address: 'Beryllveien 10, 1639 Gamle Fredrikstad', birthdate: '25.06.1976' },
  { role: 'Lysdesign/Producer', firstName: 'Harald Andreas', lastName: 'Sundby', phone: '986 00 628', email: 'harald@haslive.no', address: 'Østregate 3A, 2317 Hamar', birthdate: '02.10.1992' },
  { role: 'Systec', firstName: 'Haakon Andreas', lastName: 'Leithe Stensrud', phone: '40698032', email: 'Haakon.a.l.s@hotmail.com', address: 'Finholtvegen 3, 2067 Jessheim', birthdate: '09.06.1996' },
  { role: 'Monitor', firstName: 'Lars Petter', lastName: 'Saugen', phone: '988 68 164', email: 'larspetter@soniccity.no', address: 'Gamle Enebakkvei 71, 1188 Oslo', birthdate: '30.09.1997' },
  { role: 'Backline', firstName: 'Adrian', lastName: 'Danielsen', phone: '452 29 663', email: 'adrian.danielsen2@gmail.com', address: 'Etterstadsletta 27A, 0660 Oslo', birthdate: '27.07.1994' },
  { role: 'Production Manager', firstName: 'Marius Aleksander', lastName: 'Karlsen', phone: '46826441', email: 'marius@stgroup.no', address: 'Paal Bergs Vei 26, 0692 Oslo', birthdate: '28.01.1988' },
  { role: 'Tour Manager', firstName: 'Svein-Egil', lastName: 'Hernes', phone: '901 83 317', email: 'svein.hernes@gmail.com', address: 'Heggelibakken 57, 0374 Oslo', birthdate: '' },
  { role: 'TM2 / Management', firstName: 'Kaisa Soleng', lastName: 'Rundberg', phone: '41781032', email: 'kaisa@circlemanagement.no', address: 'Østregate 3A, 2317 Hamar', birthdate: '19.04.1999' },
  { role: 'Foto/Film', firstName: 'Hedda', lastName: 'Mikkelborg', phone: '', email: '', address: '', birthdate: '' },
];

function composePersonName(first, middle, last) {
  const parts = [];
  const f = (first || '').trim();
  const m = middle && String(middle).trim();
  const l = (last || '').trim();
  if (f) parts.push(f);
  if (m) parts.push(m);
  if (l) parts.push(l);
  return parts.join(' ');
}

async function main() {
  const deleted = await prisma.person.deleteMany({});
  console.log('Deleted', deleted.count, 'people.');

  for (const p of PEOPLE) {
    const name = composePersonName(p.firstName, null, p.lastName);
    const type = mapRoleToType(p.role);
    const birthdate = parseBirthdate(p.birthdate);
    await prisma.person.create({
      data: {
        firstName: p.firstName,
        middleName: null,
        lastName: p.lastName,
        name,
        type,
        birthdate,
        phone: p.phone?.trim() || null,
        email: p.email?.trim() || null,
        streetName: p.address?.trim() || null,
        notes: p.role || null,
      },
    });
  }

  console.log('Created', PEOPLE.length, 'people from Chris Holsten band list.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
