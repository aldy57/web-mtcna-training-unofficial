-- 0006_sumber_materi.sql
-- Penyesuaian tabel referensi sumber materi & seed 29 sumber resmi MTCNA

alter table public.refs add column if not exists description text not null default '';
alter table public.refs add column if not exists created_at timestamptz not null default now();
alter table public.refs add column if not exists updated_at timestamptz not null default now();

-- Seed atau perbarui 29 sumber materi resmi MikroTik dari bank soal
insert into public.refs (id, title, url, description)
values
  ('S01', 'MikroTik Training — FAQ ujian', 'https://mikrotik.com/training/about', 'Panduan resmi seputar program sertifikasi dan format ujian MikroTik.'),
  ('S02', 'MTCNA Training Outline — tautan resmi pada halaman training', 'https://i.mt.lv/cdn/training_pdf/mtcna_outline_2019181161836.pdf', 'Silabus garis besar kurikulum pelatihan resmi MikroTik Certified Network Associate.'),
  ('S03', 'First Time Configuration', 'https://help.mikrotik.com/docs/spaces/ROS/pages/328151/First+Time+Configuration', 'Panduan awal menghubungkan, mengakses, dan mengonfigurasi perangkat RouterOS.'),
  ('S04', 'IP Addressing', 'https://help.mikrotik.com/docs/spaces/ROS/pages/328247/IP+Addressing', 'Konfigurasi alamat IP, subnetting, network address, dan interface address pada RouterOS.'),
  ('S05', 'Configuration Management', 'https://help.mikrotik.com/docs/spaces/ROS/pages/328155/Configuration+Management', 'Manajemen backup, export file script .rsc, dan restore konfigurasi RouterOS.'),
  ('S06', 'DHCP Client', 'https://manual.mikrotik.com/docs/network-management/dhcp/client/', 'Pengaturan interface RouterOS sebagai klien DHCP untuk menerima IP otomatis.'),
  ('S07', 'DHCP', 'https://manual.mikrotik.com/docs/network-management/dhcp/', 'Konsep kerja dan arsitektur DHCP server, client, dan relay pada MikroTik.'),
  ('S08', 'DNS', 'https://manual.mikrotik.com/docs/network-management/dns/', 'Pengaturan DNS cache, static DNS entry, dan allow-remote-requests.'),
  ('S09', 'Bridging and Switching', 'https://help.mikrotik.com/docs/spaces/ROS/pages/328068/Bridging+and+Switching', 'Konsep Layer 2 bridging, penggabungan port fisik ke bridge, dan hardware offloading.'),
  ('S10', 'Spanning Tree Protocol', 'https://help.mikrotik.com/docs/spaces/ROS/pages/21725254/Spanning+Tree+Protocol', 'Pencegahan loop Layer 2 menggunakan protokol STP, RSTP, dan MSTP.'),
  ('S11', 'IP Routing', 'https://help.mikrotik.com/docs/spaces/ROS/pages/328084/IP+Routing', 'Tabel routing IP, default gateway, static routing, dan pemilihan rute aktif.'),
  ('S12', 'Wireless Interface — legacy wireless', 'https://help.mikrotik.com/docs/spaces/ROS/pages/8978446/Wireless+Interface', 'Konfigurasi interface wireless standar RouterOS, band, frequency, dan SSID.'),
  ('S13', 'Wireless Station Modes', 'https://help.mikrotik.com/docs/spaces/ROS/pages/122388518/Wireless+Station+Modes', 'Mode station wireless (station, station-pseudobridge, station-bridge).'),
  ('S14', 'Filter — chain input/forward/output', 'https://help.mikrotik.com/docs/spaces/ROS/pages/48660574/Filter', 'Struktur Firewall Filter rules berdasarkan chain input, forward, dan output.'),
  ('S15', 'NAT', 'https://help.mikrotik.com/docs/spaces/ROS/pages/3211299/NAT', 'Network Address Translation: source NAT (masquerade/srcnat) dan destination NAT (dstnat).'),
  ('S16', 'Common Firewall Matchers and Actions', 'https://help.mikrotik.com/docs/spaces/ROS/pages/250708064/Common+Firewall+Matchers+and+Actions', 'Parameter pencocokan paket dan aksi firewall (accept, drop, reject, log).'),
  ('S17', 'Queues', 'https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues', 'Manajemen bandwidth, Simple Queues, Queue Tree, dan pembatasan traffic.'),
  ('S18', 'Connection tracking', 'https://help.mikrotik.com/docs/spaces/ROS/pages/130220087/Connection+tracking', 'Mekanisme stateful firewall: new, established, related, invalid, dan untracked.'),
  ('S19', 'PPPoE', 'https://help.mikrotik.com/docs/spaces/ROS/pages/2031625/PPPoE', 'Point-to-Point Protocol over Ethernet: konfigurasi server dan client PPPoE.'),
  ('S20', 'EoIP', 'https://help.mikrotik.com/docs/spaces/ROS/pages/24805521/EoIP', 'Ethernet over IP: tunneling Layer 2 berbasis IP antar router MikroTik.'),
  ('S21', 'Torch', 'https://help.mikrotik.com/docs/spaces/ROS/pages/8323150/Torch', 'Tool monitoring real-time arus trafik, IP sumber/tujuan, dan protokol per interface.'),
  ('S22', 'Traceroute', 'https://help.mikrotik.com/docs/spaces/ROS/pages/130220138/Traceroute', 'Diagnostik rute hop-by-hop paket jaringan ke host tujuan.'),
  ('S23', 'ARP', 'https://help.mikrotik.com/docs/spaces/ROS/pages/100892687/ARP', 'Address Resolution Protocol: pemetaan IP ke MAC address dan mode ARP interface.'),
  ('S24', 'RouterOS license keys', 'https://help.mikrotik.com/docs/spaces/ROS/pages/328149/RouterOS+license+keys', 'Tingkatan lisensi MikroTik RouterOS (Level 3, 4, 5, 6) dan batas fiturnya.'),
  ('S25', 'DHCP Server', 'https://manual.mikrotik.com/docs/network-management/dhcp/server/', 'Konfigurasi DHCP server pool, network parameters, lease time, dan binding.'),
  ('S26', 'Wireless', 'https://help.mikrotik.com/docs/spaces/ROS/pages/1409138/Wireless', 'Dokumentasi komprehensif teknologi radio dan konfigurasi wireless MikroTik.'),
  ('S27', 'PPP AAA — User Database', 'https://help.mikrotik.com/docs/spaces/ROS/pages/132350049/PPP+AAA', 'Authentication, Authorization, and Accounting pada layanan PPP MikroTik.'),
  ('S28', 'Ping', 'https://help.mikrotik.com/docs/spaces/ROS/pages/8323183/Ping', 'Tool uji konektivitas ICMP echo request dan respons latensi jaringan.'),
  ('S29', 'Packet Sniffer', 'https://help.mikrotik.com/docs/spaces/ROS/pages/8323088/Packet+Sniffer', 'Tool penangkapan header dan payload paket data untuk analisis Wireshark.')
on conflict (id) do update set
  title = excluded.title,
  url = excluded.url,
  description = coalesce(nullif(excluded.description, ''), public.refs.description),
  updated_at = now();

-- Memastikan RLS aktif
alter table public.refs enable row level security;

-- Policy SELECT untuk semua user terotentikasi (peserta & admin)
drop policy if exists "refs_select_authenticated" on public.refs;
create policy "refs_select_authenticated"
  on public.refs for select
  using (auth.uid() is not null);

-- Policy MANAGE (INSERT, UPDATE, DELETE) hanya untuk admin
drop policy if exists "refs_manage_admin" on public.refs;
create policy "refs_manage_admin"
  on public.refs for all
  using (public.is_admin())
  with check (public.is_admin());

