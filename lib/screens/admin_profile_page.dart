// lib/screens/admin_profile_page.dart
import 'package:flutter/material.dart';

class AdminProfilePage extends StatelessWidget {
  const AdminProfilePage({super.key});

  // Inline responsive helpers
  double _r(BuildContext context, double v) {
    double w = MediaQuery.of(context).size.width;
    if (w < 360) return v * 0.85;
    if (w < 400) return v * 0.93;
    return v;
  }

  double _rf(BuildContext context, double v) {
    double w = MediaQuery.of(context).size.width;
    if (w < 360) return v * 0.82;
    if (w < 400) return v * 0.92;
    return v;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(title: const Text("Admin Profile")),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(_r(context, 16)),
        child: Column(
          children: [
            _header(context),
            SizedBox(height: _r(context, 20)),
            _body(context),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(_r(context, 20)),
      decoration: BoxDecoration(
        gradient:
            const LinearGradient(colors: [Color(0xFF2B6CB0), Color(0xFF1E90FF)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            width: _r(context, 80),
            height: _r(context, 80),
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(16)),
            child: Text("AH",
                style: TextStyle(
                    fontSize: _rf(context, 28),
                    fontWeight: FontWeight.w800,
                    color: Colors.white)),
          ),
          SizedBox(width: _r(context, 12)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Asha Hospital",
                    style: TextStyle(
                        fontSize: _rf(context, 20),
                        fontWeight: FontWeight.w800,
                        color: Colors.white)),
                Text("Mumbai, Maharashtra",
                    style: TextStyle(
                        fontSize: _rf(context, 13),
                        color: Colors.white70)),
                SizedBox(height: _r(context, 6)),
                Container(
                  padding: EdgeInsets.all(_r(context, 6)),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text("Verified Hospital",
                      style: TextStyle(
                          fontSize: _rf(context, 12),
                          color: Colors.white,
                          fontWeight: FontWeight.w700)),
                ),
                SizedBox(height: _r(context, 10)),
                Container(
                  padding: EdgeInsets.all(_r(context, 8)),
                  decoration: BoxDecoration(
                    color: Colors.black26,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text("Hospital Key: HSP-2394-8821",
                      style: TextStyle(
                          fontSize: _rf(context, 12),
                          color: Colors.white,
                          fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _body(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(_r(context, 20)),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(context, "Hospital Information"),
          const InfoCard(
              title: "Address", value: "Plot 21, Marine Lines, Mumbai"),
          const InfoCard(title: "Contact", value: "+91 9876543210"),
          const InfoCard(title: "Email", value: "admin@ashahospital.com"),
          const InfoCard(title: "Registration No.", value: "MH-HOSP-99821"),
          SizedBox(height: _r(context, 20)),

          _sectionTitle(context, "Key Staff Members"),
          const StaffCard(
              initials: "DN",
              name: "Dr. Neeraj Deshmukh",
              info: "Dean • 15 yrs experience"),
          const StaffCard(
              initials: "SP",
              name: "Dr. Sneha Patil",
              info: "Chief Surgeon • Organ Transplant Lead"),
          const StaffCard(
              initials: "RK",
              name: "Rohan Kulkarni",
              info: "Blood Bank Coordinator"),
          SizedBox(height: _r(context, 20)),

          _sectionTitle(context, "Verification Documents"),
          const DocumentCard(text: "Hospital License (Uploaded)"),
          const DocumentCard(text: "Blood Bank Certificate (Verified)"),
          SizedBox(height: _r(context, 20)),

          Row(
            children: [
              Expanded(
                child: ActionButton2(
                    text: "Edit Profile",
                    color: Colors.blue,
                    textColor: Colors.white),
              ),
              SizedBox(width: _r(context, 12)),
              Expanded(
                child: ActionButton2(
                    text: "Contact Support",
                    color: const Color(0xFFF1F3F5),
                    textColor: Colors.black87),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _sectionTitle(BuildContext context, String title) {
    return Padding(
      padding: EdgeInsets.only(bottom: _r(context, 12)),
      child: Text(title,
          style: TextStyle(
              fontSize: _rf(context, 16), fontWeight: FontWeight.w800)),
    );
  }
}

// ---------------- Reusable Cards ----------------

class InfoCard extends StatelessWidget {
  final String title, value;
  const InfoCard({super.key, required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    double r(double v) => w < 360 ? v * 0.85 : v;
    double rf(double v) => w < 360 ? v * 0.82 : v;

    return Container(
      margin: EdgeInsets.only(bottom: r(10)),
      padding: EdgeInsets.all(r(12)),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E6ED)),
      ),
      child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                    fontSize: rf(14), fontWeight: FontWeight.bold)),
            SizedBox(height: r(4)),
            Text(value,
                style: TextStyle(fontSize: rf(13), color: Colors.black87))
          ]),
    );
  }
}

class StaffCard extends StatelessWidget {
  final String initials, name, info;
  const StaffCard(
      {super.key,
      required this.initials,
      required this.name,
      required this.info});

  @override
  Widget build(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    double r(double v) => w < 360 ? v * 0.85 : v;
    double rf(double v) => w < 360 ? v * 0.82 : v;

    return Container(
      margin: EdgeInsets.only(bottom: r(12)),
      padding: EdgeInsets.all(r(12)),
      decoration: BoxDecoration(
        color: const Color(0xFFFBFCFD),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFEEF2F4)),
      ),
      child: Row(
        children: [
          Container(
            width: r(50),
            height: r(50),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFFDCE7F8),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(initials,
                style: TextStyle(
                    fontSize: rf(16), fontWeight: FontWeight.w800)),
          ),
          SizedBox(width: r(12)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name,
                  style: TextStyle(
                      fontSize: rf(14), fontWeight: FontWeight.w800)),
              Text(info,
                  style: TextStyle(
                      fontSize: rf(12), color: Colors.black54)),
            ],
          )
        ],
      ),
    );
  }
}

class DocumentCard extends StatelessWidget {
  final String text;
  const DocumentCard({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    double r(double v) => w < 360 ? v * 0.85 : v;
    double rf(double v) => w < 360 ? v * 0.82 : v;

    return Container(
      margin: EdgeInsets.only(bottom: r(8)),
      padding: EdgeInsets.all(r(12)),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF6F6),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFFDEDE)),
      ),
      child: Text(text,
          style: TextStyle(fontSize: rf(13), color: Colors.black87)),
    );
  }
}

class ActionButton2 extends StatelessWidget {
  final String text;
  final Color color, textColor;

  const ActionButton2(
      {super.key,
      required this.text,
      required this.color,
      required this.textColor});

  @override
  Widget build(BuildContext context) {
    double w = MediaQuery.of(context).size.width;
    double r(double v) => w < 360 ? v * 0.85 : v;
    double rf(double v) => w < 360 ? v * 0.82 : v;

    return Container(
      padding: EdgeInsets.symmetric(vertical: r(14)),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text,
          style: TextStyle(
              fontSize: rf(14),
              fontWeight: FontWeight.w800,
              color: textColor)),
    );
  }
}
