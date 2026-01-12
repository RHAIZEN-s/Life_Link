import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/local_user_service.dart';
import '../models/user_model.dart';
import '../main.dart';

class SignUp extends StatefulWidget {
  const SignUp({super.key});

  @override
  SignUpState createState() => SignUpState();
}

class SignUpState extends State<SignUp> {
  final TextEditingController nameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController otpController = TextEditingController();

  bool _showOtp = false;

  late String userRole;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    userRole = ModalRoute.of(context)?.settings.arguments as String? ?? "User";
  }

  void _signup() async {
    if (!_showOtp) {
      if (nameController.text.isEmpty ||
          emailController.text.isEmpty ||
          passwordController.text.isEmpty) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text("Please fill all fields")));
        return;
      }
      // Send registration data to server
      final response = await http.post(
        Uri.parse('http://localhost:3000/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': nameController.text.trim(),
          'email': emailController.text.trim(),
          'password': passwordController.text.trim(),
        }),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        setState(() {
          _showOtp = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("OTP sent — enter 6-digit code to verify"),
          ),
        );
      } else {
        String msg = 'Registration failed';
        try {
          final data = jsonDecode(response.body);
          if (data['message'] != null) msg = data['message'];
        } catch (_) {}
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(msg)));
      }
      return;
    }
    // OTP verification step
    if (otpController.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Please enter OTP")));
      return;
    }
    // Send OTP to server for verification
    final verifyResponse = await http.post(
      Uri.parse('http://localhost:3000/auth/verify'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': emailController.text.trim(),
        'otp': otpController.text.trim(),
      }),
    );
    if (verifyResponse.statusCode == 200 || verifyResponse.statusCode == 201) {
      // Save user locally and navigate to initial profile setup
      final user = UserModel(
        fullName: nameController.text.trim(),
        bloodGroup: "A+",
        donations: 0,
      );
      await LocalUserService.saveUser(user);
      await LocalUserService.saveEmail(emailController.text.trim());
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/initial_profile');
      }
    } else {
      String msg = 'OTP verification failed';
      try {
        final data = jsonDecode(verifyResponse.body);
        if (data['message'] != null) msg = data['message'];
      } catch (_) {}
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

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
              const SizedBox(height: 40),

              // MINI LOGO (ASSET)
              assetImage("assets/images/minilogo.png", width: 160, height: 40),

              const SizedBox(height: 30),

              const Text(
                "Sign Up",
                style: TextStyle(
                  color: Color(0xFFC62C2C),
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Text(
                "Please register below",
                style: TextStyle(color: Color(0xFF2E2D2D), fontSize: 14),
              ),

              const SizedBox(height: 30),

              _boxField("Name", nameController),
              _boxField(
                "Email",
                emailController,
                keyboardType: TextInputType.emailAddress,
              ),
              _boxField("Password", passwordController, obscureText: true),

              if (_showOtp) ...[
                _boxField(
                  "Enter 6-digit OTP",
                  otpController,
                  keyboardType: TextInputType.number,
                  obscureText: false,
                ),
                const SizedBox(height: 10),
              ],

              const SizedBox(height: 40),

              // SIGN UP BUTTON (RESPONSIVE)
              GestureDetector(
                onTap: _signup,
                child: Container(
                  margin: const EdgeInsets.symmetric(
                    horizontal: 22,
                    vertical: 20,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC62C2C),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      _showOtp ? 'Verify OTP' : 'Sign Up',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Already have an account? "),
                  GestureDetector(
                    onTap: () => Navigator.pushReplacementNamed(
                      context,
                      '/login',
                      arguments: userRole,
                    ),
                    child: const Text(
                      "Log In",
                      style: TextStyle(
                        color: Color(0xFFC62C2C),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 50),
            ],
          ),
        ),
      ),
    );
  }

  // ------------------------------------------------------------
  // INPUT FIELD UI (UNCHANGED)
  // ------------------------------------------------------------
  Widget _boxField(
    String hint,
    TextEditingController controller, {
    TextInputType? keyboardType,
    bool obscureText = false,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black, width: 1),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            vertical: 20,
            horizontal: 10,
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    otpController.dispose();
    super.dispose();
  }
}
