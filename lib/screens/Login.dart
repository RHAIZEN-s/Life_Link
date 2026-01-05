import 'package:flutter/material.dart';
import '../services/local_user_service.dart';
import '../models/user_model.dart';
import '../main.dart'; // To access MainNavigation

class LogIn extends StatefulWidget {
  const LogIn({super.key});

  @override
  LogInState createState() => LogInState();
}

class LogInState extends State<LogIn> {
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController otpController = TextEditingController();

  late String userRole;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    userRole = ModalRoute.of(context)?.settings.arguments as String? ?? "User";
  }

  void _login() async {
    if (phoneController.text.isEmpty || otpController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please fill all fields")),
      );
      return;
    }

    final phone = phoneController.text.trim();
    final otp = otpController.text.trim();

    // ADMIN LOGIN
    if (phone == "9999999999" && otp == "1234") {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => const MainNavigation(isAdmin: true),
        ),
      );
      return;
    }

    // USER LOGIN
    final existingUser = await LocalUserService.getUserOrNull();

    if (existingUser == null) {
      Navigator.pushReplacementNamed(context, '/initial_profile');
      return;
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => const MainNavigation(isAdmin: false),
      ),
    );
  }

  // ------------------------------------------------------------
  // ASSET IMAGE
  // ------------------------------------------------------------
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: 50),

              // MINI LOGO (ASSET)
              assetImage(
                "assets/images/minilogo.png",
                width: 160,
                height: 40,
              ),

              const SizedBox(height: 75),

              const Text(
                "Welcome",
                style: TextStyle(
                  color: Color(0xFFC62C2C),
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 30),

              // PHONE INPUT
              _boxInput(
                phoneController,
                "Phone Number",
                TextInputType.phone,
              ),

              // OTP INPUT
              _boxInput(
                otpController,
                "OTP",
                TextInputType.number,
              ),

              const SizedBox(height: 20),

              const Padding(
                padding: EdgeInsets.only(right: 40),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    "Forget password?",
                    style: TextStyle(
                      color: Color(0xFF484848),
                      fontSize: 14,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // LOGIN BUTTON
              SizedBox(
                width: double.infinity,
                child: GestureDetector(
                  onTap: _login,
                  child: Container(
                    margin:
                        const EdgeInsets.symmetric(horizontal: 22, vertical: 20),
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: const Color(0xFFC62C2C),
                    ),
                    child: const Center(
                      child: Text(
                        "Log In",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // SIGNUP LINK
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Don’t have an account? "),
                  GestureDetector(
                    onTap: () => Navigator.pushNamed(
                      context,
                      '/signup',
                      arguments: userRole,
                    ),
                    child: const Text(
                      "Sign Up",
                      style: TextStyle(
                        color: Color(0xFFC62C2C),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 60),
            ],
          ),
        ),
      ),
    );
  }

 
  Widget _boxInput(
      TextEditingController ctrl, String hint, TextInputType type) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black, width: 1),
      ),
      child: TextField(
        controller: ctrl,
        keyboardType: type,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
        ),
      ),
    );
  }
}
