/*
# Complete Seed Data (Fixed)
Consolidated seed data script including agences, categories, clients, suppliers, roles, user roles assignments, and the corrected vehicle/driver/rental mock data.
*/

delete from public.gps_positions;
delete from public.gps_devices;
delete from public.fines;
delete from public.incidents;
delete from public.accidents;
delete from public.payments;
delete from public.invoice_items;
delete from public.invoices;
delete from public.expenses;
delete from public.work_orders;
delete from public.maintenance_requests;
delete from public.fuel_entries;
delete from public.mission_staff;
delete from public.missions;
delete from public.rental_inspections;
delete from public.rentals;
delete from public.bookings;
delete from public.vehicle_documents;
delete from public.drivers;
delete from public.vehicles;
delete from public.vehicle_categories;
delete from public.agencies;
delete from public.suppliers;
delete from public.clients;
delete from public.user_roles;
delete from public.roles;

-- 1. AGENCIES
insert into public.agencies (organization_id, name, code, city, address, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Agence Cocody', 'ABJ-COC', 'Abidjan', 'Cocody Boulevard Latrille', true),
  ('11111111-1111-1111-1111-111111111111', 'Agence Yopougon', 'ABJ-YOP', 'Abidjan', 'Yopougon Maroc', true),
  ('11111111-1111-1111-1111-111111111111', 'Agence Bouaké', 'BKE', 'Bouaké', 'Bouaké Commerce', true);

-- 1.5 ROLES & USER ASSIGNMENT
insert into public.roles (organization_id, code, name, description, is_system, permissions)
values
  ('11111111-1111-1111-1111-111111111111', 'org_admin', 'Administrateur entreprise', 'Direction générale — tous droits', true,
    '["vehicles.read","vehicles.write","drivers.read","drivers.write","clients.read","clients.write","rentals.read","rentals.write","missions.read","missions.write","movements.read","movements.write","maintenance.read","maintenance.write","fuel.read","fuel.write","finance.read","finance.write","reports.read","settings.read","settings.write","users.read","users.write","audit.read","documents.read","documents.write","notifications.read","gps.read"]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'parc_manager', 'Responsable parc', 'Gestion du parc et des chauffeurs', true,
    '["vehicles.read","vehicles.write","drivers.read","drivers.write","clients.read","rentals.read","rentals.write","missions.read","missions.write","movements.read","movements.write","maintenance.read","maintenance.write","fuel.read","fuel.write","reports.read","documents.read","notifications.read","gps.read"]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'accountant', 'Comptable', 'Gestion financière', true,
    '["vehicles.read","drivers.read","clients.read","rentals.read","missions.read","finance.read","finance.write","reports.read","documents.read","notifications.read"]'::jsonb),
  ('11111111-1111-1111-1111-111111111111', 'rental_agent', 'Agent de location', 'Saisie des locations et clients', true,
    '["vehicles.read","drivers.read","clients.read","clients.write","rentals.read","rentals.write","movements.read","movements.write","fuel.read","documents.read","notifications.read"]'::jsonb);

-- Automatically assign the org_admin role to the administrator 'director@afc.ci'
insert into public.user_roles (user_id, role_id, organization_id)
select up.id, r.id, up.organization_id
from public.user_profiles up
join public.roles r on r.organization_id = up.organization_id and r.code = 'org_admin'
where up.email = 'director@afc.ci';

-- 2. VEHICLE CATEGORIES
insert into public.vehicle_categories (organization_id, name, code, description)
values
  ('11111111-1111-1111-1111-111111111111', 'Berline','berline','Véhicule de tourisme standard'),
  ('11111111-1111-1111-1111-111111111111', 'SUV','suv','Véhicule utilitaire sport'),
  ('11111111-1111-1111-1111-111111111111', '4x4','4x4','Véhicule tout terrain'),
  ('11111111-1111-1111-1111-111111111111', 'Minibus','minibus','Transport de groupe'),
  ('11111111-1111-1111-1111-111111111111', 'Camion','camion','Transport de marchandises'),
  ('11111111-1111-1111-1111-111111111111', 'Moto','moto','Deux-roues'),
  ('11111111-1111-1111-1111-111111111111', 'Ambulance','ambulance','Transport sanitaire'),
  ('11111111-1111-1111-1111-111111111111', 'Véhicule blindé','blinde','Véhicule sécurisé'),
  ('11111111-1111-1111-1111-111111111111', 'Camionnette','camionnette','Utilitaire léger');

-- 3. SUPPLIERS
insert into public.suppliers (organization_id, type, name, contact_person, phone, email, address, services, rating, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'garage','Garage Central Toyota','Koffi Mécanicien','+225 27 22 88 11 22','garage.toyama@ci.com','Yopougon','Mécanique, vidange, freinage',4.5,'Garage principal'),
  ('11111111-1111-1111-1111-111111111111', 'garage','Garage Peugeot Cocody','Aboubakar','+225 27 22 88 11 23','garage.psa@ci.com','Cocody','Mécanique, électronique',4.2,null),
  ('11111111-1111-1111-1111-111111111111', 'insurer','NSIA Assurance','Agent commercial','+225 27 22 99 33 44','contact@nsia.ci','Plateau','Assurance auto tous risques',4.6,'Assureur principal'),
  ('11111111-1111-1111-1111-111111111111', 'insurer','AXA Côte d''Ivoire','Service sinistres','+225 27 22 99 33 45','sinistres@axa.ci','Plateau','Assurance auto et flotte',4.3,null),
  ('11111111-1111-1111-1111-111111111111', 'fuel_station','Station Total Cocody','Gérant','+225 27 22 77 55 66',null,'Cocody','Carburant essence/diesel',4.0,'Carte carburant AFC'),
  ('11111111-1111-1111-1111-111111111111', 'fuel_station','Station Pétro Ivoire Yopougon','Gérant','+225 27 22 77 55 67',null,'Yopougon','Carburant essence/diesel',3.9,null),
  ('11111111-1111-1111-1111-111111111111', 'parts_vendor','Pièces Auto Express','Vendeur','+225 07 55 66 77 88','vente@piecesexpress.ci','Adjamé','Pièces détachées toutes marques',4.1,null),
  ('11111111-1111-1111-1111-111111111111', 'gps_provider','TrackGPS Africa','Support technique','+225 27 22 66 44 33','support@trackgps.africa','Marcory','Traceurs GPS, géolocalisation',4.4,'Fournisseur GPS principal');

-- 4. CLIENTS
insert into public.clients (organization_id, type, name, representative, contact_person, phone, email, address, tax_id, trade_register, credit_limit, payment_delay_days, risk_level, account_status, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'company','BTP Construction Plus SARL','Marc Kouadio','Marc Kouadio','+225 27 22 33 44 55','contact@btpplus.ci','Zone 4, Abidjan','CI-BTP-4455','CI-ABJ-2018-123',5000000,30,'low','active','Client fidèle, 3-4 locations/mois'),
  ('11111111-1111-1111-1111-111111111111', 'company','Groupe Hôtelier Azur','Sophia Bamba','Sophia Bamba','+225 27 22 33 44 56','s.bamba@azur-hotels.com','Bingerville','CI-AZU-5566',null,3000000,15,'low','active','Navette aéroport régulière'),
  ('11111111-1111-1111-1111-111111111111', 'individual','Jean-Marc Aka',null,'Jean-Marc Aka','+225 07 77 88 99 00','jm.aka@gmail.com','Cocody Riviera 3',null::text,null::text,500000,0,'low','active','Client particulier premium'),
  ('11111111-1111-1111-1111-111111111111', 'administration','Ministère des Transports','Directeur de Cabinet','Adjoua Koné','+225 27 22 33 44 57','cabinet@transports.gouv.ci','Plateau, Abidjan',null::text,null::text,10000000,45,'low','active','Missions administratives'),
  ('11111111-1111-1111-1111-111111111111', 'ngo','Croix Rouge Côte d''Ivoire','Coordonnateur Logistique','Ibrahim Cissé','+225 27 22 33 44 58','logistique@crci.org','Cocody Angré',null::text,null::text,4000000,30,'low','active','Transport humanitaire'),
  ('11111111-1111-1111-1111-111111111111', 'company','Société SecurPro SARL','CEO','Paul Gnagne','+225 07 77 88 99 01','p.gnagne@securpro.ci','Marcory Zone 3','CI-SEC-7788','CI-ABJ-2019-456',8000000,15,'medium','active','Escorte VIP'),
  ('11111111-1111-1111-1111-111111111111', 'individual','Aminata Traoré',null::text,'Aminata Traoré','+225 07 77 88 99 02','a.traore@yahoo.fr','Yopougon Selmer',null::text,null::text,300000,0,'low','active','Location week-end'),
  ('11111111-1111-1111-1111-111111111111', 'company','TransPlus Logistique','DG','Bakary Fofana','+225 27 22 33 44 59','b.fofana@transplus.ci','Vridi',null::text,'CI-ABJ-2017-789',6000000,30,'medium','active','Convoyage marchandises'),
  ('11111111-1111-1111-1111-111111111111', 'company','Eventis Organisation','Manager','Christelle Aya','+225 07 77 88 99 03','c.aya@eventis.ci','Cocody',null::text,'CI-ABJ-2020-321',2000000,15,'high','active','Événementiel, paiements parfois en retard'),
  ('11111111-1111-1111-1111-111111111111', 'individual','Dr. Paul Yapi',null::text,'Dr. Paul Yapi','+225 07 77 88 99 04','p.yapi@med.ci','Cocody Riviera 2',null::text,null::text,1000000,0,'low','active','Médecin, location ponctuelle'),
  ('11111111-1111-1111-1111-111111111111', 'partner','Agence Voyage Discovery','Responsable','Roger Tanoh','+225 27 22 33 44 60','r.tanoh@discovery.ci','Plateau',null::text,null::text,5000000,15,'low','active','Partenaire touristique'),
  ('11111111-1111-1111-1111-111111111111', 'company','BuildMat Côte d''Ivoire','Directeur Logistique','Adama Soro','+225 27 22 33 44 61','a.soro@buildmat.ci','Yopougon',null::text,'CI-ABJ-2016-654',4000000,30,'medium','suspended','Retard de paiement');

-- 5. VEHICLES
insert into public.vehicles (organization_id, agency_id, category_id, internal_number, registration, vin, brand, model, category, vehicle_type, color, year_manufactured, fuel_type, tank_capacity, estimated_consumption, transmission, seats, current_mileage, ownership_type, owner_name, purchase_price, estimated_value, monthly_depreciation, status, availability, notes)
select '11111111-1111-1111-1111-111111111111', a.id, c.id, x.internal_number, x.registration, x.vin, x.brand, x.model, x.category, x.vehicle_type, x.color, x.year_manufactured, x.fuel_type, x.tank_capacity, x.estimated_consumption, x.transmission, x.seats, x.current_mileage, x.ownership_type, x.owner_name, x.purchase_price, x.estimated_value, x.monthly_depreciation, x.status, x.availability, x.notes
from (values
  ('ABJ-001','AB-1234-AB','VF1BX123456','Toyota','Corolla','berline','berline','gris',2021,'essence',50.0,6.5,'manuelle',5,42000,'owned',null::text,12000000,8000000,200000,'available','available','Bon état général'),
  ('ABJ-002','AB-5678-CD','WVWZZZ12345','Volkswagen','Passat','berline','berline','noir',2020,'diesel',60.0,5.8,'automatique',5,68000,'owned',null::text,15000000,9000000,250000,'rented','unavailable','En location client BTP'),
  ('ABJ-003','AB-9012-EF','JM1NC123456','Mazda','CX-5','suv','suv','blanc',2022,'essence',58.0,7.2,'automatique',5,21000,'owned',null::text,18000000,13000000,300000,'available','available','SUV premium'),
  ('ABJ-004','AB-3456-GH','JTMHV123456','Toyota','Hilux','4x4','4x4','rouge',2019,'diesel',80.0,9.0,'manuelle',5,95000,'owned',null::text,22000000,11000000,350000,'on_mission','unavailable','Mission escorte Abidjan'),
  ('ABJ-005','AB-7890-IJ','WBAPH123456','BMW','X5','suv','suv','bleu',2021,'diesel',75.0,8.5,'automatique',5,38000,'owned',null::text,35000000,22000000,500000,'maintenance','unavailable','Vidange + freins'),
  ('YOP-001','AB-2345-JK','MALBF12345','Mitsubishi','Pajero','4x4','4x4','vert',2018,'diesel',88.0,10.0,'manuelle',5,140000,'owned',null::text,25000000,9000000,400000,'available','available','4x4 robuste'),
  ('YOP-002','AB-6789-LM','KMHMH12345','Hyundai','H1','minibus','minibus','blanc',2020,'diesel',75.0,8.0,'manuelle',9,72000,'owned',null::text,20000000,12000000,300000,'rented','unavailable','Location navette entreprise'),
  ('YOP-003','AB-0123-NO','WBAVB12345','Mercedes','Classe C','berline','berline','noir',2021,'diesel',66.0,5.5,'automatique',5,31000,'owned',null::text,28000000,18000000,400000,'available','available','Véhicule de direction'),
  ('YOP-004','AB-4567-PQ','NMTB123456','Nissan','Urvan','minibus','minibus','blanc',2017,'diesel',70.0,8.5,'manuelle',15,165000,'partner','Transports Konan SARL',15000000,6000000,200000,'available','available','Véhicule partenaire'),
  ('BKE-001','AB-8901-RS','VF7BA12345','Peugeot','Partner','camionnette','camionnette','blanc',2019,'diesel',60.0,6.0,'manuelle',3,110000,'owned',null::text,9000000,4500000,150000,'available','available','Utilitaire logistique'),
  ('BKE-002','AB-2345-TU','JTFHT12345','Isuzu','NPR','camion','camion','jaune',2016,'diesel',140.0,15.0,'manuelle',3,210000,'owned',null::text,30000000,8000000,400000,'repair','unavailable','Réparation moteur garage'),
  ('BKE-003','AB-6789-VW','MBHKR12345','Ford','Ranger','4x4','4x4','argent',2020,'diesel',80.0,9.5,'manuelle',5,88000,'owned',null::text,26000000,14000000,350000,'available','available','4x4 chantier BTP'),
  ('ABJ-006','AB-9012-XY','TMNKJ12345','Toyota','Hiace','minibus','minibus','blanc',2021,'diesel',70.0,8.0,'manuelle',15,45000,'owned',null::text,19000000,13000000,300000,'reserved','unavailable','Réservé client ONG'),
  ('ABJ-007','AB-3456-YZ','WDDZF12345','Mercedes','GLE','suv','suv','noir',2022,'diesel',80.0,8.8,'automatique',5,18000,'owned',null::text,45000000,32000000,600000,'available','available','SUV VIP'),
  ('ABJ-008','AB-7890-AC','1FTFW12345','Ford','Everest','suv','suv','gris',2021,'diesel',80.0,9.0,'automatique',7,36000,'owned',null::text,30000000,20000000,450000,'accident','unavailable','Accident voie rapide'),
  ('YOP-005','AB-0123-BD','KMHHM12345','Hyundai','Tucson','suv','suv','rouge',2020,'essence',62.0,7.5,'automatique',5,58000,'owned',null::text,16000000,10000000,250000,'available','available',null::text),
  ('BKE-004','AB-4567-EF','9BWZZZ12345','Volkswagen','Amarok','4x4','4x4','blanc',2020,'diesel',80.0,9.2,'manuelle',5,79000,'owned',null::text,28000000,16000000,400000,'available','available',null::text),
  ('ABJ-009','AB-8901-GH','TMABZ12345','Toyota','Land Cruiser','4x4','4x4','blanc',2022,'diesel',93.0,11.0,'automatique',8,12000,'owned',null::text,55000000,42000000,700000,'on_mission','unavailable','Escorte VIP sécurisée')
) as x(internal_number, registration, vin, brand, model, category, vehicle_type, color, year_manufactured, fuel_type, tank_capacity, estimated_consumption, transmission, seats, current_mileage, ownership_type, owner_name, purchase_price, estimated_value, monthly_depreciation, status, availability, notes)
join public.agencies a on a.organization_id = '11111111-1111-1111-1111-111111111111'
  and a.code = case
    when x.internal_number like 'YOP-%' then 'ABJ-YOP'
    when x.internal_number like 'ABJ-%' then 'ABJ-COC'
    when x.internal_number like 'BKE-%' then 'BKE'
  end
join public.vehicle_categories c on c.code = x.category and c.organization_id = '11111111-1111-1111-1111-111111111111';

-- 6. DRIVERS
insert into public.drivers (organization_id, agency_id, matricule, first_name, last_name, gender, birth_date, phone, address, emergency_contact, hire_date, contract_type, status, license_number, license_category, license_issue_date, license_expiry_date, experience_years, languages, salary, bonus, rating, certifications, notes)
select '11111111-1111-1111-1111-111111111111', a.id, x.matricule, x.first_name, x.last_name, x.gender, x.birth_date, x.phone, x.address, x.emergency_contact, x.hire_date, x.contract_type, x.status, x.license_number, x.license_category, x.license_issue_date, x.license_expiry_date, x.experience_years, x.languages, x.salary, x.bonus, x.rating, x.certifications, x.notes
from (values
  ('ABJ-COC','CHF-001','Koffi','Yao','M','1985-05-12'::date,'+225 07 11 22 33','Cocody Abidjan','+225 05 99 88 77','2019-03-01'::date,'CDI','available','PERM-001','B,C,EC','2010-04-01'::date,'2025-04-01'::date,12,'Français, Baoulé',250000,50000,4.8,'Premiers secours','Chauffeur expérimenté'),
  ('ABJ-COC','CHF-002','Awa','Bamba','F','1990-08-23'::date,'+225 07 11 22 34','Yopougon Abidjan','+225 05 99 88 76','2020-06-15'::date,'CDI','on_mission','PERM-002','B','2012-05-01'::date,'2025-05-01'::date,10,'Français, Anglais',220000,40000,4.9,'VIP escort','Spécialiste escorte'),
  ('BKE','CHF-003','Moussa','Touré','M','1988-01-30'::date,'+225 07 11 22 35','Bouaké','+225 05 99 88 75','2018-01-10'::date,'CDI','on_mission','PERM-003','B,C,EC,ED','2008-02-01'::date,'2024-10-15'::date,15,'Français, Dioula',230000,45000,4.5,'Permis à renouveler','Permis à renouveler'),
  ('ABJ-COC','CHF-004','Ibrahim','Cissé','M','1992-11-05'::date,'+225 07 11 22 36','Adjamé Abidjan','+225 05 99 88 74','2021-09-01'::date,'CDD','available','PERM-004','B,C','2015-03-01'::date,'2026-03-01'::date,8,'Français, Bambara',200000,30000,4.2,null::text,null::text),
  ('ABJ-YOP','CHF-005','Aminata','Koné','F','1995-03-18'::date,'+225 07 11 22 37','Treichville Abidjan','+225 05 99 88 73','2022-02-01'::date,'CDD','resting','PERM-005','B','2018-06-01'::date,'2026-06-01'::date,6,'Français',180000,25000,4.6,'En repos','En repos'),
  ('ABJ-YOP','CHF-006','Sékou','Camara','M','1983-07-22'::date,'+225 07 11 22 38','Koumassi Abidjan','+225 05 99 88 72','2016-05-01'::date,'CDI','on_mission','PERM-006','B,C,EC,EB','2005-01-01'::date,'2027-01-01'::date,18,'Français, Malinké',280000,60000,4.7,'Transport marchandises','Chauffeur poids lourd'),
  ('ABJ-COC','CHF-007','Fatim','Zerbo','F','1991-12-10'::date,'+225 07 11 22 39','Cocody Abidjan','+225 05 99 88 71','2020-11-01'::date,'CDI','available','PERM-007','B','2013-09-01'::date,'2025-09-01'::date,11,'Français, Mooré',210000,35000,4.8,null::text,null::text),
  ('ABJ-YOP','CHF-008','Adama','Traoré','M','1987-04-25'::date,'+225 07 11 22 40','Yopougon Abidjan','+225 05 99 88 70','2017-08-01'::date,'CDI','suspended','PERM-008','B,C','2009-07-01'::date,'2026-07-01'::date,14,'Français, Bambara',240000,30000,3.9,'Suspendu pour retard','Suspendu pour retard'),
  ('BKE','CHF-009','Mariam','Sangaré','F','1998-06-15'::date,'+225 07 11 22 41','Bouaké','+225 05 99 88 69','2023-01-15'::date,'Stage','available','PERM-009','B','2021-04-01'::date,'2026-04-01'::date,3,'Français',150000,15000,4.3,'Jeune chauffeur','Jeune chauffeur'),
  ('BKE','CHF-010','Bakary','Doumbia','M','1982-09-30'::date,'+225 07 11 22 42','Bouaké','+225 05 99 88 68','2015-02-01'::date,'CDI','on_mission','PERM-010','B,C,EC,ED,EB','2003-03-01'::date,'2028-03-01'::date,21,'Français, Bambara, Dioula',300000,70000,4.6,'Transport long distance','Chauffeur senior'),
  ('ABJ-COC','CHF-011','Eric','Kouadio','M','1994-02-14'::date,'+225 07 11 22 43','Cocody Abidjan','+225 05 99 88 67','2021-04-01'::date,'CDI','absent','PERM-011','B','2016-08-01'::date,'2025-08-01'::date,9,'Français',200000,25000,4.0,'Absent maladie','Absent maladie'),
  ('ABJ-YOP','CHF-012','Christelle','Adjoua','F','1996-10-08'::date,'+225 07 11 22 44','Yopougon Abidjan','+225 05 99 88 66','2022-08-01'::date,'CDI','available','PERM-012','B,C','2019-12-01'::date,'2027-12-01'::date,7,'Français, Bété',190000,30000,4.7,null::text,null::text)
) as x(agency_code, matricule, first_name, last_name, gender, birth_date, phone, address, emergency_contact, hire_date, contract_type, status, license_number, license_category, license_issue_date, license_expiry_date, experience_years, languages, salary, bonus, rating, certifications, notes)
join public.agencies a on a.code = x.agency_code and a.organization_id = '11111111-1111-1111-1111-111111111111';

-- 7. VEHICLE DOCUMENTS
insert into public.vehicle_documents (organization_id, vehicle_id, type, document_number, issuer, start_date, expiry_date, cost, status, file_url, reminder_enabled, responsible)
select '11111111-1111-1111-1111-111111111111', v.id, x.type, x.document_number, x.issuer, x.start_date, x.expiry_date, x.cost, x.status, x.file_url, x.reminder_enabled, x.responsible
from (values
  ('AB-1234-AB','insurance','POL-2024-001','NSIA Assurance','2024-01-15'::date,'2025-01-14'::date,450000,'valid',null::text,true,'Fatou'),
  ('AB-1234-AB','visite_technique','VT-2024-001','Centre Technique Cocody','2024-03-01'::date,'2025-03-01'::date,35000,'valid',null::text,true,'Yao'),
  ('AB-1234-AB','carte_grise','CG-AB1234','Ministère des Transports','2021-02-01'::date,null::date,25000,'valid',null::text,false,'Yao'),
  ('AB-5678-CD','insurance','POL-2024-002','AXA CI','2024-08-01'::date,'2024-08-10'::date,520000,'expired',null::text,true,'Fatou'),
  ('AB-5678-CD','visite_technique','VT-2024-002','Centre Technique Yopougon','2024-04-01'::date,'2024-10-01'::date,35000,'expired',null::text,true,'Yao'),
  ('AB-9012-EF','insurance','POL-2024-003','NSIA Assurance','2024-06-01'::date,'2025-06-01'::date,620000,'valid',null::text,true,'Fatou'),
  ('AB-3456-GH','insurance','POL-2024-004','SUNU Assurance','2024-09-01'::date,'2024-12-15'::date,580000,'expiring',null::text,true,'Fatou'),
  ('AB-3456-GH','visite_technique','VT-2024-003','Centre Technique Cocody','2024-05-01'::date,'2024-11-05'::date,35000,'expiring',null::text,true,'Yao'),
  ('AB-2345-JK','insurance','POL-2024-005','AXA CI','2024-07-15'::date,'2025-07-14'::date,600000,'valid',null::text,true,'Fatou'),
  ('AB-6789-LM','insurance','POL-2024-006','NSIA Assurance','2024-02-01'::date,'2024-11-01'::date,720000,'expiring',null::text,true,'Fatou')
) as x(reg, type, document_number, issuer, start_date, expiry_date, cost, status, file_url, reminder_enabled, responsible)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111';

-- 8. RENTALS
insert into public.rentals (organization_id, reference, client_id, vehicle_id, driver_id, agency_departure_id, start_datetime, planned_return_datetime, actual_return_datetime, destination, days_count, km_included, daily_rate, deposit, total_amount, status, payment_method, notes)
select '11111111-1111-1111-1111-111111111111', x.ref, c.id, v.id, d.id, a.id, x.start_dt, x.plan_ret, x.act_ret, x.dest, x.days, x.km, x.rate, x.dep, x.total, x.status, x.pm, x.notes
from (values
  ('LOC-2024-001','BTP Construction Plus SARL','AB-5678-CD','Koffi Yao','Agence Cocody','2024-10-01 08:00'::timestamptz,'2024-10-31 18:00'::timestamptz,null::timestamptz,'Chantier Bassam',30,3000,45000,300000,1350000,'in_progress','transfer','Location longue durée chantier'),
  ('LOC-2024-002','Groupe Hôtelier Azur','AB-6789-LM','Awa Bamba','Agence Cocody','2024-10-15 06:00'::timestamptz,'2024-10-22 22:00'::timestamptz,null::timestamptz,'Aéroport - Hôtel',7,1000,60000,200000,420000,'in_progress','transfer','Navette aéroport'),
  ('LOC-2024-003','Jean-Marc Aka','AB-1234-AB',null::text,'Agence Cocody','2024-10-20 09:00'::timestamptz,'2024-10-22 18:00'::timestamptz,'2024-10-22 18:30'::timestamptz,'Abidjan',3,300,35000,150000,105000,'returned','card','Retour effectué'),
  ('LOC-2024-004','Croix Rouge Côte d''Ivoire','AB-2345-JK','Ibrahim Cissé','Agence Yopougon','2024-10-25 07:00'::timestamptz,'2024-11-01 19:00'::timestamptz,null::timestamptz,'Man',7,2000,40000,150000,280000,'in_progress','transfer','Mission humanitaire'),
  ('LOC-2024-005','Aminata Traoré','YOP-003',null::text,'Agence Yopougon','2024-10-26 17:00'::timestamptz,'2024-10-28 18:00'::timestamptz,'2024-10-28 18:00'::timestamptz,'Abidjan',2,150,45000,150000,90000,'returned','cash','Location week-end'),
  ('LOC-2024-006','Ministère des Transports','AB-9012-EF','Fatim Zerbo','Agence Cocody','2024-10-28 08:00'::timestamptz,'2024-10-30 18:00'::timestamptz,null::timestamptz,'Yamoussoukro',3,500,55000,200000,165000,'in_progress','transfer','Mission administrative'),
  ('LOC-2024-007','Société SecurPro SARL','AB-3456-GH','Koffi Yao','Agence Cocody','2024-09-20 08:00'::timestamptz,'2024-09-25 18:00'::timestamptz,'2024-09-25 17:00'::timestamptz,'Abidjan',5,800,50000,200000,250000,'closed','transfer','Escorte clôturée'),
  ('LOC-2024-008','Dr. Paul Yapi','AB-9012-EF',null::text,'Agence Cocody','2024-10-05 10:00'::timestamptz,'2024-10-07 18:00'::timestamptz,'2024-10-07 20:00'::timestamptz,'Abidjan',2,200,55000,150000,110000,'closed','cash','Location médicale'),
  ('LOC-2024-009','TransPlus Logistique','BKE-001','Sékou Camara','Agence Bouaké','2024-10-22 06:00'::timestamptz,'2024-10-29 18:00'::timestamptz,null::timestamptz,'San Pedro',7,1500,38000,120000,266000,'in_progress','transfer','Convoyage marchandises'),
  ('LOC-2024-010','Eventis Organisation','AB-7890-IJ',null::text,'Agence Cocody','2024-09-15 12:00'::timestamptz,'2024-09-18 18:00'::timestamptz,'2024-09-19 10:00'::timestamptz,'Grand-Bassam',3,400,65000,250000,195000,'late','mobile_money','Retard de restitution + frais')
) as x(ref, client_name, reg, driver_name, agency_name, start_dt, plan_ret, act_ret, dest, days, km, rate, dep, total, status, pm, notes)
join public.clients c on c.name = x.client_name and c.organization_id = '11111111-1111-1111-1111-111111111111'
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.drivers d on (d.first_name||' '||d.last_name) = x.driver_name and d.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.agencies a on a.name = x.agency_name and a.organization_id = '11111111-1111-1111-1111-111111111111';

-- 9. MISSIONS
insert into public.missions (organization_id, reference, client_id, vehicle_id, primary_driver_id, agency_id, mission_type, departure_point, destination, intermediate_stops, start_datetime, planned_end_datetime, passengers, confidentiality, security_level, instructions, onsite_contact, billed_amount, estimated_costs, advance_amount, status)
select '11111111-1111-1111-1111-111111111111', x.ref, c.id, v.id, d.id, a.id, x.mtype, x.dep, x.dest, x.stops, x.start_dt, x.plan_end, x.pax, x.conf, x.sec, x.instr, x.onsite, x.billed, x.est, x.adv, x.status
from (values
  ('MIS-2024-001','Société SecurPro SARL','AB-3456-GH','Koffi Yao','Agence Cocody','vip_escort','Aéroport Félix Houphouët-Boigny','Hôtel Ivoire, Cocody','Corniche Sud','2024-10-28 14:00'::timestamptz,'2024-10-28 22:00'::timestamptz,4,'confidential','high','Itinéraire sécurisé, discrétion totale','+225 07 12 34 56 78',850000,120000,100000,'in_progress'),
  ('MIS-2024-002','Groupe Hôtelier Azur','AB-6789-LM','Awa Bamba','Agence Cocody','shuttle','Hôtel Azur Bingerville','Aéroport FHB',null::text,'2024-10-29 05:00'::timestamptz,'2024-10-29 08:00'::timestamptz,12,'normal','standard','Navette matinale groupe VIP','+225 07 12 34 56 79',180000,30000,0,'planned'),
  ('MIS-2024-003','BTP Construction Plus SARL','AB-9012-XY','Moussa Touré','Agence Bouaké','personnel_transport','Bouaké siège','Chantier Béoumi','M''Bahiakro','2024-10-26 06:00'::timestamptz,'2024-10-26 18:00'::timestamptz,8,'normal','standard','Transport personnel chantier','+225 07 12 34 56 80',320000,80000,50000,'in_progress'),
  ('MIS-2024-004','Ministère des Transports','AB-8901-GH','Bakary Doumbia','Agence Cocody','administrative','Plateau Ministère','Yamoussoukro','Bouaflé','2024-10-30 07:00'::timestamptz,'2024-10-30 20:00'::timestamptz,3,'confidential','standard','Mission inspection services déconcentrés','+225 07 12 34 56 81',450000,100000,75000,'planned'),
  ('MIS-2024-005','Croix Rouge Côte d''Ivoire','AB-2345-JK','Sékou Camara','Agence Yopougon','logistics','Dépôt CRCI Cocody','Man','Daloa','2024-10-25 06:00'::timestamptz,'2024-10-26 20:00'::timestamptz,2,'normal','standard','Convoyage aide humanitaire','+225 07 12 34 56 82',280000,95000,40000,'in_progress'),
  ('MIS-2024-006','TransPlus Logistique','BKE-002','Sékou Camara','Agence Bouaké','delivery','Entrepôt Vridi','San Pedro port','Divo','2024-10-22 05:00'::timestamptz,'2024-10-23 18:00'::timestamptz,2,'normal','standard','Livraison conteneur','+225 07 12 34 56 83',520000,130000,80000,'departed')
) as x(ref, client_name, reg, driver_name, agency_name, mtype, dep, dest, stops, start_dt, plan_end, pax, conf, sec, instr, onsite, billed, est, adv, status)
join public.clients c on c.name = x.client_name and c.organization_id = '11111111-1111-1111-1111-111111111111'
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.drivers d on (d.first_name||' '||d.last_name) = x.driver_name and d.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.agencies a on a.name = x.agency_name and a.organization_id = '11111111-1111-1111-1111-111111111111';

-- 10. FUEL ENTRIES
insert into public.fuel_entries (organization_id, vehicle_id, driver_id, date, station_name, fuel_type, quantity, price_per_unit, amount, mileage, level_before, level_after, payment_method, fuel_card)
select '11111111-1111-1111-1111-111111111111', v.id, d.id, x.dt, x.station, x.ft, x.qty, x.ppu, x.amt, x.km, x.lb, x.la, x.pm, x.fc
from (values
  ('AB-1234-AB','Koffi Yao','2024-10-20 09:30'::timestamptz,'Station Total Cocody','essence',45.0,780,35100,42000,'1/4','full','card','AFC-FUEL-001'),
  ('AB-5678-CD','Koffi Yao','2024-10-01 08:15'::timestamptz,'Station Total Cocody','diesel',55.0,745,40975,68000,'1/8','full','card','AFC-FUEL-001'),
  ('AB-9012-EF','Fatim Zerbo','2024-10-22 10:00'::timestamptz,'Station Pétro Ivoire Yopougon','essence',50.0,780,39000,21000,'1/4','full','card','AFC-FUEL-002'),
  ('AB-3456-GH','Koffi Yao','2024-10-28 14:30'::timestamptz,'Station Total Cocody','diesel',70.0,745,52150,95000,'1/8','full','card','AFC-FUEL-001'),
  ('AB-2345-JK','Ibrahim Cissé','2024-10-25 06:30'::timestamptz,'Station Pétro Ivoire Yopougon','diesel',75.0,745,55875,140000,'1/4','full','card','AFC-FUEL-002'),
  ('AB-6789-LM','Awa Bamba','2024-10-15 06:15'::timestamptz,'Station Total Cocody','diesel',60.0,745,44700,72000,'1/8','full','card','AFC-FUEL-001'),
  ('AB-9012-XY','Moussa Touré','2024-10-26 06:45'::timestamptz,'Station Pétro Ivoire Yopougon','essence',52.0,780,40560,45000,'1/4','full','card','AFC-FUEL-003'),
  ('AB-8901-GH','Bakary Doumbia','2024-10-22 05:30'::timestamptz,'Station Total Cocody','diesel',78.0,745,58110,210000,'1/8','full','card','AFC-FUEL-003'),
  ('BKE-001','Sékou Camara','2024-10-22 06:00'::timestamptz,'Station Pétro Ivoire Yopougon','diesel',55.0,745,40975,110000,'1/4','full','card','AFC-FUEL-004'),
  ('AB-1234-AB','Eric Kouadio','2024-10-10 11:00'::timestamptz,'Station Total Cocody','essence',40.0,780,31200,39000,'1/4','full','cash',null::text),
  ('AB-9012-EF','Aminata Koné','2024-10-12 14:00'::timestamptz,'Station Pétro Ivoire Yopougon','essence',48.0,780,37440,18000,'1/8','full','cash',null::text),
  ('AB-7890-AC',null::text,'2024-10-15 16:00'::timestamptz,'Station Total Cocody','diesel',65.0,745,48425,36000,'1/4','full','card','AFC-FUEL-001')
) as x(reg, driver_name, dt, station, ft, qty, ppu, amt, km, lb, la, pm, fc)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.drivers d on (d.first_name||' '||d.last_name) = x.driver_name and d.organization_id = '11111111-1111-1111-1111-111111111111';

-- 11. MAINTENANCE REQUESTS + WORK ORDERS
insert into public.maintenance_requests (organization_id, vehicle_id, reference, requested_by, issue_type, description, priority, estimated_cost, status)
select '11111111-1111-1111-1111-111111111111', v.id, x.ref, x.req, x.issue, x.desc, x.prio, x.est, x.status
from (values
  ('MR-2024-001','AB-7890-IJ','Yao Konan','freins','Remplacement plaquettes de frein avant','high',120000,'completed'),
  ('MR-2024-002','AB-8901-GH','Yao Konan','vidange','Vidange moteur + filtres','normal',45000,'completed'),
  ('MR-2024-003','BKE-002','Moussa Touré','moteur','Révision complète moteur - fumée anormale','critical',850000,'in_progress'),
  ('MR-2024-004','AB-7890-AC','Yao Konan','carrosserie','Réparation carrosserie après accident','high',320000,'in_progress'),
  ('MR-2024-005','AB-5678-CD','Yao Konan','pneus','Remplacement 4 pneus usés','normal',240000,'pending_validation')
) as x(ref, reg, req, issue, "desc", prio, est, status)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111';

insert into public.work_orders (organization_id, reference, vehicle_id, garage_supplier_id, description, estimated_cost, actual_cost, labor_cost, parts_cost, start_date, end_date, return_to_service_date, status)
select '11111111-1111-1111-1111-111111111111', x.ref, v.id, s.id, x.desc, x.est, x.act, x.lab, x.parts, x.sd, x.ed, x.rts, x.status
from (values
  ('WO-2024-001','AB-7890-IJ','Garage Central Toyota','Remplacement plaquettes frein avant',120000,115000,35000,80000,'2024-10-10'::date,'2024-10-11'::date,'2024-10-12'::date,'completed'),
  ('WO-2024-002','AB-8901-GH','Garage Central Toyota','Vidange + filtres',45000,42000,15000,27000,'2024-10-08'::date,'2024-10-08'::date,'2024-10-09'::date,'completed'),
  ('WO-2024-003','BKE-002','Garage Peugeot Cocody','Révision moteur',850000,920000,280000,640000,'2024-10-20'::date,null::date,null::date,'in_progress')
) as x(ref, reg, garage, "desc", est, act, lab, parts, sd, ed, rts, status)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
join public.suppliers s on s.name = x.garage and s.organization_id = '11111111-1111-1111-1111-111111111111';

-- 12. EXPENSES
insert into public.expenses (organization_id, reference, vehicle_id, category, description, amount, expense_date, payment_method, supplier_id, requested_by, approved_by, status)
select '11111111-1111-1111-1111-111111111111', x.ref, v.id, x.cat, x.desc, x.amt, x.ed, x.pm, s.id, x.req, x.app, x.status
from (values
  ('EXP-2024-001','AB-1234-AB','carburant','Plein carburant 45L',35100,'2024-10-20'::date,'card','Station Total Cocody','Eric Kouadio','Yao Konan','paid'),
  ('EXP-2024-002','AB-5678-CD','carburant','Plein carburant 55L',40975,'2024-10-01'::date,'card','Station Total Cocody','Koffi Yao','Yao Konan','paid'),
  ('EXP-2024-003','AB-7890-IJ','entretien','Plaquettes de frein avant',115000,'2024-10-11'::date,'transfer','Garage Central Toyota','Yao Konan','Awa Bamba','paid'),
  ('EXP-2024-004','AB-8901-GH','entretien','Vidange + filtres',42000,'2024-10-08'::date,'transfer','Garage Central Toyota','Yao Konan','Awa Bamba','paid'),
  ('EXP-2024-005','BKE-002','reparation','Révision moteur',920000,'2024-10-20'::date,'transfer','Garage Peugeot Cocody','Moussa Touré','Awa Bamba','approved'),
  ('EXP-2024-006','AB-3456-GH','assurance','Renouvellement assurance',580000,'2024-09-01'::date,'transfer','NSIA Assurance','Fatou Diarra','Awa Bamba','paid'),
  ('EXP-2024-007','AB-2345-JK','peages','Péages trajet Cocody-Man',15000,'2024-10-25'::date,'cash',null::text,'Ibrahim Cissé','Yao Konan','approved'),
  ('EXP-2024-008','AB-9012-XY','peages','Péages Bouaké-Béoumi',8000,'2024-10-26'::date,'cash',null::text,'Moussa Touré','Yao Konan','pending')
) as x(ref, reg, cat, "desc", amt, ed, pm, sup, req, app, status)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.suppliers s on s.name = x.sup and s.organization_id = '11111111-1111-1111-1111-111111111111';

-- 13. INVOICES + ITEMS + PAYMENTS
insert into public.invoices (organization_id, reference, client_id, rental_id, issue_date, due_date, subtotal, total, paid_amount, balance, status)
select '11111111-1111-1111-1111-111111111111', x.ref, c.id, r.id, x.issue, x.due, x.sub, x.total, x.paid, x.bal, x.status
from (values
  ('FAC-2024-001','BTP Construction Plus SARL','LOC-2024-001','2024-10-01'::date,'2024-10-31'::date,1350000,1350000,1350000,0,'partial'),
  ('FAC-2024-002','Groupe Hôtelier Azur','LOC-2024-002','2024-10-15'::date,'2024-10-30'::date,420000,420000,420000,0,'paid'),
  ('FAC-2024-003','Jean-Marc Aka','LOC-2024-003','2024-10-22'::date,'2024-10-22'::date,105000,105000,105000,0,'paid'),
  ('FAC-2024-004','Croix Rouge Côte d''Ivoire','LOC-2024-004','2024-10-25'::date,'2024-11-24'::date,280000,280000,140000,140000,'partial'),
  ('FAC-2024-005','Aminata Traoré','LOC-2024-005','2024-10-28'::date,'2024-10-28'::date,90000,90000,90000,0,'paid'),
  ('FAC-2024-006','Eventis Organisation','LOC-2024-010','2024-09-19'::date,'2024-10-04'::date,195000,195000,0,195000,'overdue'),
  ('FAC-2024-007','Société SecurPro SARL','LOC-2024-007','2024-09-25'::date,'2024-10-10'::date,250000,250000,250000,0,'paid')
) as x(ref, client_name, rental_ref, issue, due, sub, total, paid, bal, status)
join public.clients c on c.name = x.client_name and c.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.rentals r on r.reference = x.rental_ref and r.organization_id = '11111111-1111-1111-1111-111111111111';

insert into public.invoice_items (organization_id, invoice_id, description, quantity, unit_price, total)
select '11111111-1111-1111-1111-111111111111', i.id, x.desc, x.qty, x.up, x.total
from (values
  ('FAC-2024-001','Location Toyota Corolla - 30 jours',30,45000,1350000),
  ('FAC-2024-002','Location Hyundai H1 - 7 jours',7,60000,420000),
  ('FAC-2024-003','Location Toyota Corolla - 3 jours',3,35000,105000),
  ('FAC-2024-004','Location Mitsubishi Pajero - 7 jours',7,40000,280000),
  ('FAC-2024-005','Location Mercedes Classe C - 2 jours',2,45000,90000),
  ('FAC-2024-006','Location Mercedes GLE - 3 jours + pénalité retard',3,65000,195000),
  ('FAC-2024-007','Location Toyota Hilux - 5 jours escorte',5,50000,250000)
) as x(ref, "desc", qty, up, total)
join public.invoices i on i.reference = x.ref and i.organization_id = '11111111-1111-1111-1111-111111111111';

insert into public.payments (organization_id, reference, invoice_id, client_id, amount, payment_date, payment_method, account_type)
select '11111111-1111-1111-1111-111111111111', x.pref, i.id, c.id, x.amt, x.pdt, x.pm, x.at
from (values
  ('PAY-2024-001','FAC-2024-001','BTP Construction Plus SARL',1350000,'2024-10-05 10:00'::timestamptz,'transfer','bank'),
  ('PAY-2024-002','FAC-2024-002','Groupe Hôtelier Azur',420000,'2024-10-16 09:00'::timestamptz,'transfer','bank'),
  ('PAY-2024-003','FAC-2024-003','Jean-Marc Aka',105000,'2024-10-22 18:30'::timestamptz,'card','bank'),
  ('PAY-2024-004','FAC-2024-004','Croix Rouge Côte d''Ivoire',140000,'2024-10-26 12:00'::timestamptz,'transfer','bank'),
  ('PAY-2024-005','FAC-2024-005','Aminata Traoré',90000,'2024-10-28 18:00'::timestamptz,'cash','cash'),
  ('PAY-2024-006','FAC-2024-007','Société SecurPro SARL',250000,'2024-09-26 11:00'::timestamptz,'transfer','bank')
) as x(pref, ref, client_name, amt, pdt, pm, at)
join public.invoices i on i.reference = x.ref and i.organization_id = '11111111-1111-1111-1111-111111111111'
join public.clients c on c.name = x.client_name and c.organization_id = '11111111-1111-1111-1111-111111111111';

-- 14. ACCIDENTS + INCIDENTS + FINES
insert into public.accidents (organization_id, vehicle_id, driver_id, accident_date, location, description, accident_type, severity, third_parties, injuries, material_damage, estimated_amount, deductible, insurer, status)
select '11111111-1111-1111-1111-111111111111', v.id, d.id, x.adt, x.loc, x.desc, x.atype, x.sev, x.tp, x.inj, x.md, x.est, x.ded, x.ins, x.status
from (values
  ('AB-7890-AC','Eric Kouadio','2024-10-15 16:30'::timestamptz,'Voie rapide Bassam, Abidjan','Collision arrière au feu rouge','collision','moderate','Toyota Corolla tiers','Aucun','Pare-chocs arrière endommagé',320000,50000,'AXA Côte d''Ivoire','repair'),
  ('AB-2345-JK','Ibrahim Cissé','2024-08-20 14:00'::timestamptz,'Route Abidjan-Yamoussoukro','Sortie de route sur chaussée glissante','sortie_route','severe','Aucun','Aucun','Carrosserie avant + suspension',750000,100000,'NSIA Assurance','reimbursed')
) as x(reg, driver, adt, loc, "desc", atype, sev, tp, inj, md, est, ded, ins, status)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.drivers d on (d.first_name||' '||d.last_name) = x.driver and d.organization_id = '11111111-1111-1111-1111-111111111111';

insert into public.incidents (organization_id, vehicle_id, driver_id, incident_type, incident_date, description, resolution, status)
select '11111111-1111-1111-1111-111111111111', v.id, d.id, x.itype, x.idt, x.desc, x.res, x.status
from (values
  ('AB-8901-GH','Bakary Doumbia','panne','2024-10-18 09:00'::timestamptz,'Batterie déchargée, démarrage impossible','Remplacement batterie sur place','resolved'),
  ('AB-3456-GH','Koffi Yao','retard','2024-10-27 15:00'::timestamptz,'Retard 30 min sur mission escorte','Client informé, pas de plainte','closed'),
  ('AB-5678-CD','Koffi Yao','crevaison','2024-10-05 12:00'::timestamptz,'Crevaison pneu avant gauche','Roue de secours posée','resolved'),
  ('AB-6789-LM','Awa Bamba','probleme_gps','2024-10-16 07:00'::timestamptz,'Traceur GPS ne renvoie plus de position','Fournisseur contacté, redémarrage à distance','open')
) as x(reg, driver, itype, idt, "desc", res, status)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.drivers d on (d.first_name||' '||d.last_name) = x.driver and d.organization_id = '11111111-1111-1111-1111-111111111111';

insert into public.fines (organization_id, vehicle_id, driver_id, fine_date, reason, location, amount, authority, payment_deadline, paid_by, status, salary_deducted)
select '11111111-1111-1111-1111-111111111111', v.id, d.id, x.fd, x.reason, x.loc, x.amt, x.auth, x.pd, x.pb, x.status, x.sd
from (values
  ('AB-1234-AB','Eric Kouadio','2024-09-28'::date,'Excès de vitesse 70 en zone 50','Cocody Riviera',25000,'Police municipale','2024-10-28'::date,'AFC','paid',true),
  ('AB-5678-CD','Koffi Yao','2024-09-15'::date,'Stationnement interdit','Plateau Abidjan',10000,'Police municipale','2024-10-15'::date,'AFC','paid',false),
  ('AB-2345-JK','Ibrahim Cissé','2024-10-02'::date,'Dépassement dangereux','Route A3',15000,'Gendarmerie','2024-11-02'::date,null::text,'unpaid',false),
  ('AB-3456-GH','Koffi Yao','2024-08-30'::date,'Non-respect feu rouge','Yopougon',20000,'Gendarmerie','2024-09-30'::date,'AFC','contested',false)
) as x(reg, driver, fd, reason, loc, amt, auth, pd, pb, status, sd)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.drivers d on (d.first_name||' '||d.last_name) = x.driver and d.organization_id = '11111111-1111-1111-1111-111111111111';

-- 15. GPS DEVICES + DEMO POSITIONS
insert into public.gps_devices (organization_id, vehicle_id, provider, imei, device_id, sim_phone, installed_at, is_active, battery_level, last_signal_at)
select '11111111-1111-1111-1111-111111111111', v.id, 'TrackGPS Africa', x.imei, x.did, x.phone, x.inst, true, x.bat, x.signal
from (values
  ('AB-1234-AB','861234567890123','TGPS-001','+225 07 00 55 01','2024-01-10 09:00'::timestamptz,92,'2024-10-28 10:00'::timestamptz),
  ('AB-5678-CD','861234567890124','TGPS-002','+225 07 00 55 02','2024-01-10 09:30'::timestamptz,88,'2024-10-28 10:00'::timestamptz),
  ('AB-3456-GH','861234567890125','TGPS-003','+225 07 00 55 03','2024-01-10 10:00'::timestamptz,75,'2024-10-28 10:00'::timestamptz),
  ('AB-2345-JK','861234567890126','TGPS-004','+225 07 00 55 04','2024-01-10 10:30'::timestamptz,90,'2024-10-28 10:00'::timestamptz)
) as x(reg, imei, did, phone, inst, bat, signal)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111';

insert into public.gps_positions (organization_id, vehicle_id, gps_device_id, latitude, longitude, speed, heading, engine_state, battery_level, recorded_at, is_demo)
select '11111111-1111-1111-1111-111111111111', v.id, g.id, x.lat, x.lng, x.spd, x.hdg, x.eng, x.bat, x.rdt, true
from (values
  ('AB-1234-AB',5.3600,-4.0083,0,0,'off',92,'2024-10-28 09:00'::timestamptz),
  ('AB-5678-CD',5.3480,-4.0090,35,90,'on',88,'2024-10-28 10:00'::timestamptz),
  ('AB-3456-GH',5.3200,-3.9800,45,135,'on',75,'2024-10-28 10:00'::timestamptz),
  ('AB-2345-JK',5.4100,-4.0200,28,270,'on',90,'2024-10-28 10:00'::timestamptz)
) as x(reg, lat, lng, spd, hdg, eng, bat, rdt)
join public.vehicles v on v.registration = x.reg and v.organization_id = '11111111-1111-1111-1111-111111111111'
left join public.gps_devices g on g.vehicle_id = v.id and g.organization_id = '11111111-1111-1111-1111-111111111111';

-- 16. NOTIFICATIONS
insert into public.notifications (organization_id, user_id, type, title, message, severity, link, is_read)
select '11111111-1111-1111-1111-111111111111', coalesce((select id from public.user_profiles where email = 'director@afc.ci'), (select id from public.user_profiles limit 1)), x.type, x.title, x.msg, x.sev, x.link, x.read
from (values
  ('insurance_renewal','Assurance expirée','Véhicule AB-5678-CD: assurance expirée depuis le 10/08/2024','critical','/vehicles',false),
  ('visite_technique','Visite technique expirée','Véhicule AB-5678-CD: visite technique expirée','critical','/vehicles',false),
  ('insurance_renewal','Assurance à renouveler','Véhicule AB-3456-GH: assurance expire le 15/12/2024','warning','/vehicles',false),
  ('visite_technique','Visite technique bientôt','Véhicule AB-3456-GH: visite technique expire le 05/11/2024','warning','/vehicles',true),
  ('late_payment','Facture en retard','Client Eventis Organisation: facture FAC-2024-006 en retard de paiement','warning','/finance/invoices',false),
  ('permis_renewal','Permis à renouveler','Chauffeur Moussa Touré: permis expire le 15/10/2024','critical','/drivers',false),
  ('late_return','Retour en retard','Location LOC-2024-010: retard de restitution, frais appliqués','warning','/rentals',false),
  ('maintenance_due','Entretien à programmer','Véhicule AB-5678-CD: 4 pneus à remplacer','info','/maintenance',true),
  ('breakdown','Véhicule en réparation','Véhicule BKE-002: révision moteur en cours au garage','info','/maintenance',true)
) as x(type, title, msg, sev, link, read);

-- 17. AUDIT LOGS
insert into public.audit_logs (organization_id, user_id, user_email, action, module, entity_type, ip_address, created_at)
select '11111111-1111-1111-1111-111111111111', coalesce((select id from public.user_profiles where email = 'director@afc.ci'), (select id from public.user_profiles limit 1)), x.email, x.action, x.module, x.entity, x.ip, x.dt
from (values
  ('director@afc.ci','login','auth','session','196.20.10.5','2024-10-28 08:00'::timestamptz),
  ('parc@afc.ci','create','vehicles','vehicle','196.20.10.6','2024-10-28 09:15'::timestamptz),
  ('finance@afc.ci','financial_change','finance','payment','196.20.10.7','2024-10-28 10:30'::timestamptz),
  ('agent@afc.ci','create','rentals','rental','196.20.10.8','2024-10-28 11:00'::timestamptz)
) as x(email, action, module, entity, ip, dt);
