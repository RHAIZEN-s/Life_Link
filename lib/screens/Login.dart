import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/local_user_service.dart';
import '../models/user_model.dart';
import '../main.dart'; // To access MainNavigation

class LogIn extends StatefulWidget {
  const LogIn({super.key});

  @override
  LogInState createState() => LogInState();
}

class LogInState extends State<LogIn> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  late String userRole;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    userRole = ModalRoute.of(context)?.settings.arguments as String? ?? "User";
  }

  void _login() async {
    if (emailController.text.isEmpty || passwordController.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Please fill all fields")));
      return;
    }
    final email = emailController.text.trim();
    final password = passwordController.text.trim();

    // ADMIN LOGIN (example admin credentials)
    if (email == "admin@life_link.com" && password == "admin1234") {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainNavigation(isAdmin: true)),
      );
      return;
    }

    // USER LOGIN via backend
    final response = await http.post(
      Uri.parse('http://localhost:3000/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      await LocalUserService.saveEmail(email);
      // Optionally parse user info from response and save locally
      // For now, just navigate to main app
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainNavigation(isAdmin: false)),
      );
    } else {
      String msg = 'Login failed';
      try {
        final data = jsonDecode(response.body);
        if (data['message'] != null) msg = data['message'];
      } catch (_) {}
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
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
              assetImage("assets/images/minilogo.png", width: 160, height: 40),

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

              // EMAIL INPUT
              _boxInput(emailController, "Email", TextInputType.emailAddress),

              // PASSWORD INPUT
              _boxInput(
                passwordController,
                "Password",
                TextInputType.text,
                obscureText: true,
              ),

              const SizedBox(height: 20),

              const Padding(
                padding: EdgeInsets.only(right: 40),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    "Forget password?",
                    style: TextStyle(color: Color(0xFF484848), fontSize: 14),
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
                    margin: const EdgeInsets.symmetric(
                      horizontal: 22,
                      vertical: 20,
                    ),
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
    TextEditingController ctrl,
    String hint,
    TextInputType type, {
    bool obscureText = false,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 22, vertical: 10),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black, width: 1),
      ),
      child: TextField(
        controller: ctrl,
        keyboardType: type,
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
}
