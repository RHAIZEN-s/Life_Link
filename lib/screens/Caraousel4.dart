// lib/screens/Caraousel4.dart
import 'package:flutter/material.dart';

class Caraousel4 extends StatelessWidget {
  const Caraousel4({super.key});

  void _onRoleSelected(BuildContext context, String role) {
    Navigator.pushNamed(
      context,
      '/login',
      arguments: role,
    );
  }

  // ASSET IMAGE HELPER
  Widget assetImage(
    String path, {
    double? width,
    double? height,
    BoxFit fit = BoxFit.contain,
  }) {
    return SizedBox(
      width: width,
      height: height,
      child: Image.asset(path, fit: fit),
    );
  }

  // ROLE CARD
  Widget roleCard({
    required String imagePath,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 120,
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Colors.grey.shade100,
          border: Border.all(color: const Color(0xFFC62C2C)),
        ),
        clipBehavior: Clip.hardEdge,
        child: assetImage(
          imagePath,
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              children: [
                const SizedBox(height: 15),

                // MINI LOGO
                assetImage(
                  "assets/images/minilogo.png",
                  width: 160,
                  height: 40,
                ),

                const SizedBox(height: 50),

                // TITLE / HEADING IMAGE
                assetImage(
                  "assets/images/carousel43.png",
                  height: 120,
                ),

                const SizedBox(height: 32),

                // DONOR CARD
                roleCard(
                  imagePath: "assets/images/carousel41.png",
                  onTap: () => _onRoleSelected(context, "Donor"),
                ),

                const SizedBox(height: 32),

                // RECIPIENT CARD
                roleCard(
                  imagePath: "assets/images/carousel42.png",
                  onTap: () => _onRoleSelected(context, "Recipient"),
                ),

                const SizedBox(height: 60),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
