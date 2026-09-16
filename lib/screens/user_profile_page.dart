import 'dart:convert';
import 'dart:typed_data';

import 'package:excel/excel.dart' as xls;
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../services/local_user_service.dart';
import 'edit_profile_page.dart';

// ---------------------------------------------------------------------------
// pubspec.yaml — add these:
//   excel: ^4.0.6
//   share_plus: ^10.0.2
//
// This page is byte-based (no dart:io, no path_provider) so it compiles and
// runs on web as well as Android/iOS/desktop.
// ---------------------------------------------------------------------------

enum DocStatus { pending, correct, incorrect }

class DonationRecord {
  final String id;
  final String hospital;
  final String type; // e.g. 'Blood', 'Plasma'
  final String date; // yyyy-MM-dd
  final String bloodGroup;
  final int units;
  final Color color;

  DonationRecord({
    required this.id,
    required this.hospital,
    required this.type,
    required this.date,
    required this.bloodGroup,
    required this.units,
    required this.color,
  });
}

class DocumentItem {
  final String id;
  final String name;
  final String? filePath;
  DocStatus status;

  DocumentItem({
    required this.id,
    required this.name,
    this.filePath,
    this.status = DocStatus.pending,
  });
}

class UserProfilePage extends StatefulWidget {
  const UserProfilePage({super.key});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  ImageProvider? profilePhoto;

  // Real, persisted profile fields.
  String fullName = 'Your Name';
  String bloodGroup = 'A+';
  int donations = 0;
  String? address;
  String? email;

  bool showPhone = false;
  bool _exporting = false;

  List<DonationRecord> donationHistory = [];
  List<DocumentItem> documents = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadProfile();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    final user = await LocalUserService.getUser();
    final profileData = await LocalUserService.getProfileData();
    final base64 = await LocalUserService.getProfilePhotoBase64();
    final savedEmail = await LocalUserService.getEmail();
    final history = await LocalUserService.getDonationHistory();
    final docs = await LocalUserService.getDocuments();

    if (!mounted) return;

    setState(() {
      if (user != null) {
        fullName = user.fullName;
        bloodGroup = user.bloodGroup;
        donations = user.donations;
      }
      address = profileData['address'];
      email = savedEmail;
      if (base64 != null) {
        profilePhoto = MemoryImage(base64Decode(base64));
      }

      donationHistory = history.map((h) {
        final type = h['type']?.toString() ?? 'Blood';
        return DonationRecord(
          id: h['id']?.toString() ?? UniqueKey().toString(),
          hospital: h['hospital']?.toString() ?? 'Unknown Hospital',
          type: type,
          date: h['date']?.toString() ?? '',
          bloodGroup: h['bloodGroup']?.toString() ?? bloodGroup,
          units: h['units'] is int
              ? h['units'] as int
              : int.tryParse('${h['units']}') ?? 1,
          color: type == 'Plasma' ? const Color(0xFF06D6A0) : Colors.red,
        );
      }).toList();

      documents = docs
          .map((d) => DocumentItem(
                id: d['id']?.toString() ?? UniqueKey().toString(),
                name: d['name']?.toString() ?? 'Document',
                filePath: d['filePath']?.toString(),
                status: _statusFromString(d['status']?.toString()),
              ))
          .toList();
    });
  }

  DocStatus _statusFromString(String? s) {
    switch (s) {
      case 'correct':
        return DocStatus.correct;
      case 'incorrect':
        return DocStatus.incorrect;
      default:
        return DocStatus.pending;
    }
  }

  String get _initials {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '';
    final first = parts.first[0];
    final last = parts.length > 1 && parts.last.isNotEmpty
        ? parts.last[0]
        : '';
    return (first + last).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _profileHeader(),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(14),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: const Color(0xFFE63946),
                  borderRadius: BorderRadius.circular(14),
                ),
                labelColor: Colors.white,
                unselectedLabelColor: Colors.black54,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700),
                tabs: const [
                  Tab(text: 'Profile'),
                  Tab(text: 'Documents'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  SingleChildScrollView(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: _contentCard(),
                  ),
                  _documentsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------- HEADER ----------------
  Widget _profileHeader() {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE63946), Color(0xFFFF6B6B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                height: 72,
                width: 72,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: profilePhoto == null
                    ? Text(
                        _initials,
                        style: const TextStyle(
                          color: Color(0xFFE63946),
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                        ),
                      )
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Image(
                          image: profilePhoto!,
                          fit: BoxFit.cover,
                          width: 72,
                          height: 72,
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      fullName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      address ?? 'Location not set',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '✅ Verified',
                  style: TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.check_box, color: Colors.blue, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Available to donate',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: const [
                  Text('Next eligible:',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                  // TODO: derive from last donation date instead of hardcoding
                  Text('2025-12-20',
                      style: TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w700)),
                ],
              )
            ],
          ),
        ],
      ),
    );
  }

  // ---------------- CONTENT CARD (Profile tab) ----------------
  Widget _contentCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 8,
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _quickStats(),
          const SizedBox(height: 24),
          _medicalDetails(),
          const SizedBox(height: 24),
          _contactSection(),
          const SizedBox(height: 24),
          _badgesSection(),
          const SizedBox(height: 24),
          _certificatesSection(),
          const SizedBox(height: 24),
          _donationHistory(),
        ],
      ),
    );
  }

  // ---------------- SECTIONS ----------------
  Widget _quickStats() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Quick Stats',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Row(
          children: [
            _statCard('$donations', 'Donations'),
            const SizedBox(width: 12),
            // TODO: points are not persisted anywhere yet
            _statCard('850', 'Points'),
          ],
        ),
      ],
    );
  }

  Widget _statCard(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F9FA),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(value,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _medicalDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Medical Details',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            GestureDetector(
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const EditProfilePage(),
                  ),
                );

                await _loadProfile();
              },
              child: _greyButton('Edit Profile'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _infoCard('Blood Group', bloodGroup),
            // TODO: pull these three from donation history / profile data
            _infoCard('Last Donation', '2025-08-08'),
            _infoCard('Next Eligible', '2025-12-20'),
            _infoCard('Associated Hospital', 'City Hospital'),
          ],
        )
      ],
    );
  }

  Widget _infoCard(String title, String value) {
    return SizedBox(
      width: (MediaQuery.of(context).size.width - 72) / 2,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFF0F0F2)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(value),
          ],
        ),
      ),
    );
  }

  Widget _contactSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Contact',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Text(
                showPhone
                    ? (email ?? 'No email set')
                    : (email != null ? '•••••@•••••' : 'No email set'),
                style: const TextStyle(fontSize: 16, letterSpacing: 1),
              ),
            ),
            GestureDetector(
              onTap: () => setState(() => showPhone = !showPhone),
              child: Container(
                height: 40,
                width: 40,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: Color(0xFF06D6A0),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  showPhone ? Icons.visibility_off : Icons.visibility,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _badgesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text('Badges',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text('See all',
                style: TextStyle(
                    color: Color(0xFFE63946),
                    decoration: TextDecoration.underline)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: const [
            _Badge(text: 'Top Donor'),
            SizedBox(width: 10),
            _Badge(text: '5\nDonations'),
            SizedBox(width: 10),
            _Badge(text: 'Community\nHero'),
          ],
        ),
      ],
    );
  }

  Widget _certificatesSection() {
    final latest = donationHistory.isNotEmpty ? donationHistory.first : null;
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFFFD6D6)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              latest == null
                  ? 'No certificate yet'
                  : 'Donation Certificate\n${latest.date}',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        const SizedBox(width: 8),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFE63946),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onPressed: latest == null ? null : () => _downloadCertificate(latest),
          child: const Text('Download'),
        )
      ],
    );
  }

  Future<void> _downloadCertificate(DonationRecord record) async {
    final bytes = await LocalUserService.getCertificateBytes(record.id);
    if (bytes == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Certificate file not found.')),
      );
      return;
    }

    final fileName = 'certificate_${record.date}.pdf';
    await Share.shareXFiles(
      [
        XFile.fromData(
          bytes,
          name: fileName,
          mimeType: 'application/pdf',
        ),
      ],
      fileNameOverrides: [fileName],
      text: 'Donation certificate — ${record.date}',
    );
  }

  Widget _donationHistory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Donation History',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            GestureDetector(
              onTap: _exporting ? null : _exportDonationHistory,
              child: _greyButton(_exporting ? 'Exporting…' : 'Export'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (donationHistory.isEmpty)
          const Text('No donations recorded yet.')
        else
          ...donationHistory.map(
            (record) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _historyTile(
                '${record.hospital} — ${record.type}',
                '${record.date} • ${record.bloodGroup} • ${record.units} unit${record.units == 1 ? '' : 's'}',
                record.color,
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _exportDonationHistory() async {
    if (donationHistory.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No donation history to export.')),
      );
      return;
    }

    setState(() => _exporting = true);
    try {
      final workbook = xls.Excel.createExcel();
      final sheetName = workbook.getDefaultSheet() ?? 'Sheet1';
      final sheet = workbook[sheetName];

      sheet.appendRow([
        xls.TextCellValue('Hospital'),
        xls.TextCellValue('Type'),
        xls.TextCellValue('Date'),
        xls.TextCellValue('Blood Group'),
        xls.TextCellValue('Units'),
      ]);

      for (final record in donationHistory) {
        sheet.appendRow([
          xls.TextCellValue(record.hospital),
          xls.TextCellValue(record.type),
          xls.TextCellValue(record.date),
          xls.TextCellValue(record.bloodGroup),
          xls.IntCellValue(record.units),
        ]);
      }

      final bytes = workbook.encode();
      if (bytes == null) {
        throw Exception('Failed to encode workbook.');
      }

      final fileName =
          'donation_history_${DateTime.now().millisecondsSinceEpoch}.xlsx';

      await Share.shareXFiles(
        [
          XFile.fromData(
            Uint8List.fromList(bytes),
            name: fileName,
            mimeType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ),
        ],
        fileNameOverrides: [fileName],
        text: 'Donation history export',
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Export failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Widget _historyTile(String title, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border(left: BorderSide(color: color, width: 4)),
        color: const Color(0xFFF8F9FA),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style:
                  const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }

  // ---------------- DOCUMENTS TAB ----------------
  Widget _documentsTab() {
    if (documents.isEmpty) {
      return const Center(
        child: Text('No documents to verify yet.'),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
      itemCount: documents.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _documentTile(documents[index]),
    );
  }

  Widget _documentTile(DocumentItem doc) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF0F0F2)),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6)],
      ),
      child: Row(
        children: [
          Icon(Icons.description_outlined, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(doc.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 4),
                _statusChip(doc.status),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _verifyButton(
            icon: Icons.check,
            color: const Color(0xFF06D6A0),
            selected: doc.status == DocStatus.correct,
            onTap: () => _setDocumentStatus(doc, DocStatus.correct),
          ),
          const SizedBox(width: 8),
          _verifyButton(
            icon: Icons.close,
            color: const Color(0xFFE63946),
            selected: doc.status == DocStatus.incorrect,
            onTap: () => _setDocumentStatus(doc, DocStatus.incorrect),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(DocStatus status) {
    late final String label;
    late final Color color;
    switch (status) {
      case DocStatus.correct:
        label = 'Correct';
        color = const Color(0xFF06D6A0);
        break;
      case DocStatus.incorrect:
        label = 'Incorrect';
        color = const Color(0xFFE63946);
        break;
      case DocStatus.pending:
        label = 'Pending review';
        color = Colors.grey;
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style:
              TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
    );
  }

  Widget _verifyButton({
    required IconData icon,
    required Color color,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 36,
        width: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? color : color.withOpacity(0.12),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: selected ? Colors.white : color),
      ),
    );
  }

  Future<void> _setDocumentStatus(DocumentItem doc, DocStatus status) async {
    setState(() {
      doc.status = status;
    });
    await LocalUserService.setDocumentStatus(
      doc.id,
      status == DocStatus.correct ? 'correct' : 'incorrect',
    );
  }

  Widget _greyButton(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F0F2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text,
          style: const TextStyle(fontWeight: FontWeight.w700)),
    );
  }
}

// ---------------- BADGE WIDGET ----------------
class _Badge extends StatelessWidget {
  final String text;
  const _Badge({required this.text});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 60,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF06D6A0), Color(0xFF26E0B0)],
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(
              color: Colors.white, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}