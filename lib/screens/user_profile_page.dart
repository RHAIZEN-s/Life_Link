import 'dart:io';
import '../services/local_user_service.dart';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'edit_profile_page.dart';

class UserProfilePage extends StatefulWidget {
  const UserProfilePage({super.key});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
ImageProvider? profilePhoto;

@override
void initState() {
  super.initState();
  _loadProfilePhoto();
}

Future<void> _loadProfilePhoto() async {
  final base64 = await LocalUserService.getProfilePhotoBase64();
  if (base64 != null) {
    final bytes = base64Decode(base64);
    setState(() {
      profilePhoto = MemoryImage(bytes);
    });
  }
}



  bool showPhone = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            children: [
              _profileHeader(),
              const SizedBox(height: 16),
              _contentCard(),
            ],
          ),
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
    ? const Text(
        'RK',
        style: TextStyle(
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
                  children: const [
                    Text(
                      'Rahul Kumar • 32',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Pune, Maharashtra',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
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

  // ---------------- CONTENT CARD ----------------
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
          _documentsSection(),
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
            _statCard('5', 'Donations'),
            const SizedBox(width: 12),
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
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => const EditProfilePage(),
          ),
        );

        if (result != null && result is ImageProvider) {
          setState(() {
            profilePhoto = result;
          });
        }
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
            _infoCard('Blood Group', 'A+'),
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
                showPhone ? '+91 98765 3210' : '+91 ••••• 3210',
                style:
                    const TextStyle(fontSize: 16, letterSpacing: 2),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF06D6A0),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                setState(() => showPhone = !showPhone);
              },
              child: Text(showPhone ? 'Hide' : 'Reveal'),
            )
          ],
        ),
      ],
    );
  }

  Widget _documentsSection() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('Documents',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        _greyButton('Verify Now'),
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
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFFFD6D6)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Donation Certificate\n2025-08-08',
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
          onPressed: () {},
          child: const Text('Download'),
        )
      ],
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
            _greyButton('Export'),
          ],
        ),
        const SizedBox(height: 12),
        _historyTile(
            'Apollo Hospital — Blood', '2025-08-08 • A+ • 2 units', Colors.red),
        const SizedBox(height: 8),
        _historyTile('City Hospital — Plasma',
            '2024-11-20 • A+ • 1 unit', const Color(0xFF06D6A0)),
      ],
    );
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
