// lib/screens/Caraousel1.dart
import 'package:flutter/material.dart';

class Caraousel3 extends StatelessWidget {
  const Caraousel3({super.key});

  // ASSET IMAGE
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

  // DOT INDICATOR
  Widget dot({required bool isActive, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        margin: const EdgeInsets.symmetric(horizontal: 6),
        width: isActive ? 28 : 10,
        height: 10,
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFFC62C2C) : Colors.grey.shade300,
          borderRadius: BorderRadius.circular(20),
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
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: Column(
              children: [
                const SizedBox(height: 15),

                // MINI LOGO
                assetImage(
                  "assets/images/minilogo.png",
                  width: 160,
                  height: 40,
                ),

                const SizedBox(height: 62),

                // MAIN IMAGE V:\Life Link App\life_link\assets\images\caraousel_1.png
                assetImage(
                  "assets/images/carousel3.png",
                  height: 404,
                ),

                const SizedBox(height: 62),

                
                

                const SizedBox(height: 82),

                // NEXT BUTTON
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFC62C2C),
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    onPressed: () {
                      Navigator.pushNamed(context, '/caraousel2');
                    },
                    child: const Text(
                      "Next",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 56),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
