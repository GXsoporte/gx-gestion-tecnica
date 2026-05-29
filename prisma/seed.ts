import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos GX Gestión Técnica...');

  const gxCompany = await prisma.company.upsert({
    where: { slug: 'gx-sistemas' },
    update: {},
    create: {
      name: 'GX Sistemas S.A.S.',
      slug: 'gx-sistemas',
      nit: '900.123.456-7',
      email: 'admin@gx.com.co',
      phone: '+57 300 000 0000',
      address: 'Calle 72 #10-20',
      city: 'Bogotá',
      country: 'Colombia',
      plan: 'ENTERPRISE',
      isActive: true,
    },
  });

  const demoCompany = await prisma.company.upsert({
    where: { slug: 'empresa-demo' },
    update: {},
    create: {
      name: 'Empresa Demo S.A.S.',
      slug: 'empresa-demo',
      nit: '800.987.654-3',
      email: 'admin@demo.com',
      phone: '+57 310 000 0000',
      address: 'Carrera 15 #93-55',
      city: 'Bogotá',
      country: 'Colombia',
      plan: 'PROFESSIONAL',
      isActive: true,
    },
  });

  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@gx.com.co' },
    update: {},
    create: {
      name: 'Super Administrador',
      email: 'superadmin@gx.com.co',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      companyId: gxCompany.id,
      position: 'Super Administrador',
    },
  });

  const companyAdmin = await prisma.user.upsert({
    where: { email: 'admin@gx.com.co' },
    update: {},
    create: {
      name: 'Carlos Rodríguez',
      email: 'admin@gx.com.co',
      password: hashedPassword,
      role: 'COMPANY_ADMIN',
      isActive: true,
      companyId: gxCompany.id,
      position: 'Gerente de Operaciones',
      phone: '+57 300 111 2222',
    },
  });

  const tech1 = await prisma.user.upsert({
    where: { email: 'tecnico1@gx.com.co' },
    update: {},
    create: {
      name: 'Andrés García',
      email: 'tecnico1@gx.com.co',
      password: hashedPassword,
      role: 'TECHNICIAN',
      isActive: true,
      companyId: gxCompany.id,
      position: 'Técnico Senior',
      phone: '+57 300 222 3333',
    },
  });

  const tech2 = await prisma.user.upsert({
    where: { email: 'tecnico2@gx.com.co' },
    update: {},
    create: {
      name: 'Laura Martínez',
      email: 'tecnico2@gx.com.co',
      password: hashedPassword,
      role: 'TECHNICIAN',
      isActive: true,
      companyId: gxCompany.id,
      position: 'Técnica de Redes',
      phone: '+57 300 333 4444',
    },
  });

  await prisma.user.upsert({
    where: { email: 'contacto@demo.com' },
    update: {},
    create: {
      name: 'Juan Pérez',
      email: 'contacto@demo.com',
      password: hashedPassword,
      role: 'CLIENT',
      isActive: true,
      companyId: demoCompany.id,
      position: 'Coordinador de TI',
      phone: '+57 310 444 5555',
    },
  });

  const client1 = await prisma.client.upsert({
    where: { code: 'CLI-000001' },
    update: {},
    create: {
      code: 'CLI-000001',
      companyName: 'Empresa Demo S.A.S.',
      nit: '800.987.654-3',
      contactName: 'Juan Pérez',
      email: 'contacto@demo.com',
      phone: '+57 310 444 5555',
      address: 'Carrera 15 #93-55',
      city: 'Bogotá',
      status: 'ACTIVE',
      observations: 'Cliente principal - Sector financiero',
      companyId: gxCompany.id,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { code: 'CLI-000002' },
    update: {},
    create: {
      code: 'CLI-000002',
      companyName: 'Constructora ABC Ltda.',
      nit: '901.234.567-8',
      contactName: 'María López',
      email: 'maria@constructoraabc.com',
      phone: '+57 320 555 6666',
      address: 'Avenida 68 #45-20',
      city: 'Medellín',
      status: 'ACTIVE',
      observations: 'Cliente sector construcción - 50 equipos',
      companyId: gxCompany.id,
    },
  });

  const client3 = await prisma.client.upsert({
    where: { code: 'CLI-000003' },
    update: {},
    create: {
      code: 'CLI-000003',
      companyName: 'Clínica San José S.A.',
      nit: '802.345.678-9',
      contactName: 'Dr. Roberto Silva',
      email: 'rsilva@clinicasanjose.com',
      phone: '+57 315 666 7777',
      address: 'Calle 10 #5-30',
      city: 'Cali',
      status: 'ACTIVE',
      observations: 'Sector salud - Prioridad alta',
      companyId: gxCompany.id,
    },
  });

  const asset1 = await prisma.asset.create({
    data: {
      assetNumber: 'GX-AST-000001',
      type: 'DESKTOP',
      brand: 'Dell',
      model: 'OptiPlex 7090',
      serial: 'DLXYZ12345',
      assignedUser: 'Juan Pérez',
      area: 'Contabilidad',
      location: 'Piso 2 - Oficina 201',
      status: 'ACTIVE',
      processor: 'Intel Core i7-11700',
      ram: '16 GB DDR4',
      storage: '512 GB SSD',
      operatingSystem: 'Windows 11 Pro',
      softwareList: 'Office 365, Adobe Acrobat, SAP',
      purchaseDate: new Date('2022-03-15'),
      warrantyExpiry: new Date('2025-03-15'),
      clientId: client1.id,
      companyId: gxCompany.id,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      assetNumber: 'GX-AST-000002',
      type: 'LAPTOP',
      brand: 'HP',
      model: 'EliteBook 850 G8',
      serial: 'HPXYZ67890',
      assignedUser: 'María García',
      area: 'Gerencia',
      location: 'Piso 3 - Oficina 301',
      status: 'MAINTENANCE',
      processor: 'Intel Core i5-1135G7',
      ram: '8 GB DDR4',
      storage: '256 GB SSD',
      operatingSystem: 'Windows 10 Pro',
      softwareList: 'Office 365, Teams, Zoom',
      purchaseDate: new Date('2021-06-10'),
      warrantyExpiry: new Date('2024-06-10'),
      clientId: client1.id,
      companyId: gxCompany.id,
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      assetNumber: 'GX-AST-000003',
      type: 'SERVER',
      brand: 'Dell',
      model: 'PowerEdge R740',
      serial: 'DLSRV98765',
      assignedUser: 'Administrador TI',
      area: 'Data Center',
      location: 'Sala de servidores',
      status: 'ACTIVE',
      processor: 'Intel Xeon Gold 6230',
      ram: '64 GB DDR4 ECC',
      storage: '4 TB RAID 5',
      operatingSystem: 'Windows Server 2022',
      softwareList: 'Active Directory, Exchange, SQL Server',
      purchaseDate: new Date('2020-01-20'),
      warrantyExpiry: new Date('2025-01-20'),
      clientId: client2.id,
      companyId: gxCompany.id,
    },
  });

  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'GX-TCK-000001',
      subject: 'Equipo lento y se congela constantemente',
      description: 'El equipo de contabilidad presenta lentitud extrema al abrir Outlook y Excel. Se congela cada 10 minutos aproximadamente.',
      type: 'HARDWARE',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      requesterName: 'Ana Gómez',
      requesterEmail: 'ana.gomez@demo.com',
      requesterPhone: '+57 300 111 2222',
      requesterPosition: 'Contadora',
      clientId: client1.id,
      assignedToId: tech1.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      relatedAssetId: asset1.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNumber: 'GX-TCK-000002',
      subject: 'Problemas de conectividad en red WiFi',
      description: 'La red WiFi del piso 2 presenta cortes intermitentes. Varios usuarios reportan desconexiones frecuentes.',
      type: 'NETWORKS',
      priority: 'MEDIUM',
      status: 'OPEN',
      requesterName: 'Carlos Torres',
      requesterEmail: 'c.torres@demo.com',
      requesterPhone: '+57 310 222 3333',
      requesterPosition: 'Coordinador de TI',
      clientId: client1.id,
      assignedToId: tech2.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      ticketNumber: 'GX-TCK-000003',
      subject: 'Microsoft 365 - Error al iniciar sesión',
      description: 'Usuarios no pueden iniciar sesión en Microsoft 365. Error: "La cuenta ha sido bloqueada".',
      type: 'MICROSOFT_365',
      priority: 'CRITICAL',
      status: 'OPEN',
      requesterName: 'Luis Ramírez',
      requesterEmail: 'l.ramirez@constructoraabc.com',
      requesterPhone: '+57 320 333 4444',
      requesterPosition: 'Director Administrativo',
      clientId: client2.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
  });

  const ticket4 = await prisma.ticket.create({
    data: {
      ticketNumber: 'GX-TCK-000004',
      subject: 'Impresora HP no imprime',
      description: 'La impresora del área de recepción muestra error de papel atascado pero no hay papel atascado visible.',
      type: 'PRINTERS',
      priority: 'LOW',
      status: 'RESOLVED',
      requesterName: 'Patricia Morales',
      requesterEmail: 'p.morales@demo.com',
      requesterPosition: 'Recepcionista',
      resolution: 'Se limpió el rodillo de alimentación y se reinició el spooler de impresión.',
      clientId: client1.id,
      assignedToId: tech1.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      closedAt: new Date(),
    },
  });

  const activity1 = await prisma.activity.create({
    data: {
      activityNumber: 'GX-ACT-000001',
      description: 'Diagnóstico y mantenimiento preventivo equipo OptiPlex 7090',
      diagnosis: 'Equipo con disco duro al 100% de uso. RAM al límite. Temperatura del procesador elevada por acumulación de polvo.',
      solution: 'Limpieza interna del equipo, aplicación de pasta térmica, optimización del sistema operativo, desinstalación de programas innecesarios.',
      priority: 'HIGH',
      status: 'COMPLETED',
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      totalMinutes: 120,
      clientId: client1.id,
      technicianId: tech1.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      ticketId: ticket1.id,
      assetId: asset1.id,
    },
  });

  const activity2 = await prisma.activity.create({
    data: {
      activityNumber: 'GX-ACT-000002',
      description: 'Revisión y configuración de red WiFi - Piso 2',
      diagnosis: 'Canal WiFi congestionado. Access point con firmware desactualizado. Interferencias de dispositivos Bluetooth.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      startTime: new Date(),
      clientId: client1.id,
      technicianId: tech2.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      ticketId: ticket2.id,
    },
  });

  const activity3 = await prisma.activity.create({
    data: {
      activityNumber: 'GX-ACT-000003',
      description: 'Mantenimiento preventivo servidor Dell PowerEdge',
      diagnosis: 'Servidor funcionando correctamente. Se realizó limpieza preventiva y actualización de drivers.',
      solution: 'Actualización de firmware, limpieza de ventiladores, verificación de discos RAID, backup de configuraciones.',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      startTime: new Date(Date.now() - 5 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      totalMinutes: 180,
      clientId: client2.id,
      technicianId: tech1.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      assetId: asset3.id,
    },
  });

  await prisma.activity.create({
    data: {
      activityNumber: 'GX-ACT-000004',
      description: 'Configuración Microsoft 365 y migración de correos',
      priority: 'HIGH',
      status: 'PENDING',
      clientId: client2.id,
      technicianId: tech2.id,
      createdById: companyAdmin.id,
      companyId: gxCompany.id,
      ticketId: ticket3.id,
    },
  });

  await prisma.maintenance.create({
    data: {
      title: 'Mantenimiento Preventivo Mensual - Empresa Demo',
      description: 'Mantenimiento preventivo de todos los equipos de la empresa.',
      type: 'PREVENTIVE',
      status: 'SCHEDULED',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      clientId: client1.id,
      technicianId: tech1.id,
      companyId: gxCompany.id,
    },
  });

  await prisma.maintenance.create({
    data: {
      title: 'Revisión Anual Servidor PowerEdge',
      description: 'Mantenimiento anual del servidor principal.',
      type: 'PREVENTIVE',
      status: 'COMPLETED',
      scheduledDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      duration: 240,
      clientId: client2.id,
      assetId: asset3.id,
      technicianId: tech1.id,
      companyId: gxCompany.id,
    },
  });

  await prisma.maintenance.create({
    data: {
      title: 'Mantenimiento Correctivo - Laptop HP EliteBook',
      description: 'Reemplazo de batería y limpieza interna de laptop gerencial.',
      type: 'CORRECTIVE',
      status: 'IN_PROGRESS',
      scheduledDate: new Date(),
      clientId: client1.id,
      assetId: asset2.id,
      technicianId: tech2.id,
      companyId: gxCompany.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Se ha iniciado el diagnóstico del equipo. Se detectó uso elevado de disco.',
      isInternal: false,
      ticketId: ticket1.id,
      userId: tech1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Nota interna: Posible fallo en el disco HDD. Recomendar cambio a SSD.',
      isInternal: true,
      ticketId: ticket1.id,
      userId: tech1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: '¿Cuándo estará listo el equipo? Lo necesitamos con urgencia.',
      isInternal: false,
      ticketId: ticket1.id,
      userId: companyAdmin.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Nuevo ticket crítico asignado',
      message: 'Se te asignó el ticket GX-TCK-000003 con prioridad crítica.',
      type: 'TICKET',
      recipientId: tech2.id,
      senderId: companyAdmin.id,
      companyId: gxCompany.id,
    },
  });

  await prisma.notification.create({
    data: {
      title: 'Mantenimiento próximo',
      message: 'Recuerda que el mantenimiento preventivo de Empresa Demo está programado para en 7 días.',
      type: 'MAINTENANCE',
      recipientId: tech1.id,
      senderId: companyAdmin.id,
      companyId: gxCompany.id,
    },
  });

  await prisma.aIDiagnosis.create({
    data: {
      input: 'Equipo lento, disco al 100%, Outlook se congela, temperatura elevada del CPU',
      diagnosis: 'El equipo presenta síntomas de cuello de botella en el subsistema de almacenamiento combinado con sobrecalentamiento del procesador.',
      causes: '1. Disco HDD mecánico saturado\n2. Acumulación de polvo en ventilación\n3. Servicios en segundo plano excesivos\n4. Posible infección por malware',
      recommendations: '1. Reemplazar HDD por SSD\n2. Limpieza física del equipo\n3. Revisar programas de inicio\n4. Ejecutar análisis antivirus',
      suggestedSolution: 'Migración inmediata de HDD a SSD Samsung 870 EVO 500GB, limpieza interna del equipo y optimización del sistema operativo.',
      criticality: 'ALTA',
      activityId: activity1.id,
      assetId: asset1.id,
      userId: tech1.id,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: 'Diagnóstico inicial del equipo',
      minutes: 30,
      userId: tech1.id,
      ticketId: ticket1.id,
      activityId: activity1.id,
    },
  });

  await prisma.timeEntry.create({
    data: {
      description: 'Mantenimiento y limpieza del equipo',
      minutes: 90,
      userId: tech1.id,
      activityId: activity1.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'Ticket',
      entityId: ticket1.id,
      newValues: JSON.stringify({ ticketNumber: 'GX-TCK-000001', status: 'OPEN' }),
      userId: companyAdmin.id,
      companyId: gxCompany.id,
    },
  });

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📧 Credenciales de acceso:');
  console.log('  Super Admin: superadmin@gx.com.co / Admin123!');
  console.log('  Admin:       admin@gx.com.co / Admin123!');
  console.log('  Técnico 1:   tecnico1@gx.com.co / Admin123!');
  console.log('  Técnico 2:   tecnico2@gx.com.co / Admin123!');
  console.log('  Cliente:     contacto@demo.com / Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
