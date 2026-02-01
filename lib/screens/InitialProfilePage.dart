import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import '../models/user_model.dart';
import '../services/local_user_service.dart';

class InitialProfilePage extends StatefulWidget {
  const InitialProfilePage({Key? key}) : super(key: key);

  @override
  State<InitialProfilePage> createState() => _InitialProfilePageState();
}

class _InitialProfilePageState extends State<InitialProfilePage> {
  final _formKey = GlobalKey<FormState>();

  // Form fields
  String? _fullName;
  DateTime? _dob;
  String? _gender;
  String? _bloodGroup;

  final TextEditingController _phoneController = TextEditingController(
    text: "+91 98765 43210",
  );
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();

  // Options
  final List<String> _genderOptions = ['Male', 'Female', 'Other'];
  final List<String> _bloodOptions = [
    'A+',
    'A-',
    'B+',
    'B-',
    'O+',
    'O-',
    'AB+',
    'AB-',
  ];

  // Pick DOB
  Future<void> _pickDob(BuildContext ctx) async {
    DateTime now = DateTime.now();
    final DateTime? picked = await showDatePicker(
      context: ctx,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(1900),
      lastDate: now,
    );
    if (picked != null) setState(() => _dob = picked);
  }

  String get _dobText {
    if (_dob == null) return 'Select date of birth';
    return "${_dob!.day}-${_dob!.month}-${_dob!.year}";
  }

  // Save & Continue
  void _saveAndContinue() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    // Prepare data
    final Map<String, dynamic> profileData = {
      'fullName': _fullName ?? '',
      'dob': _dob != null
          ? _dob!.toIso8601String().split('T')[0]
          : '', // YYYY-MM-DD
      'gender': _gender ?? '',
      'bloodGroup': _bloodGroup ?? '',
      'phone': _phoneController.text.trim(),
      'email': _emailController.text.trim(),
      'address': _addressController.text.trim(),
      // 'photo': null // Add this if you implement photo upload
    };

    final response = await http.post(
      Uri.parse('http://localhost:3000/profile/initial'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(profileData),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      // Save locally as before
      final user = UserModel(
        fullName: _fullName ?? "User",
        bloodGroup: _bloodGroup ?? "A+",
        donations: 0,
      );
      await LocalUserService.saveUser(user);

      // Save email
      await LocalUserService.saveEmail(_emailController.text.trim());

      // Save all profile data from initial profile
      await LocalUserService.saveProfileData(
        address: _addressController.text.trim().isNotEmpty
            ? _addressController.text.trim()
            : null,
        dob: _dob?.toIso8601String(),
        gender: _gender,
      );

      Navigator.pushReplacementNamed(context, '/mainnav');
    } else {
      String msg = 'Profile save failed';
      try {
        final data = jsonDecode(response.body);
        if (data['message'] != null) msg = data['message'];
      } catch (_) {}
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1D3557),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // HEADER
              Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 22,
                  horizontal: 16,
                ),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE63946), Color(0xFFFF6B6B)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Column(
                  children: [
                    Text(
                      'Complete Your Profile',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Help us match you better',
                      style: TextStyle(fontSize: 13, color: Colors.white70),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // WHITE CARD FORM
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Basic Details',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1D3557),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // ❌ Upload photo disabled
                      Container(
                        width: 120,
                        height: 120,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(
                            color: const Color(0xFFE63946).withOpacity(0.4),
                            width: 3,
                          ),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: const Text(
                          "Upload Photo\n(Not active)",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFFE63946),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Name
                      _label("Full Name"),
                      TextFormField(
                        decoration: _inputDecoration("Enter your name"),
                        onSaved: (v) => _fullName = v?.trim(),
                        validator: (v) => v!.isEmpty ? "Enter your name" : null,
                      ),

                      const SizedBox(height: 12),

                      // DOB
                      _label("Date of Birth"),
                      InkWell(
                        onTap: () => _pickDob(context),
                        child: InputDecorator(
                          decoration: _inputDecoration(""),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_dobText),
                              const Icon(Icons.calendar_today),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Gender
                      _label("Gender"),
                      DropdownButtonFormField(
                        decoration: _inputDecoration("Select gender"),
                        items: _genderOptions
                            .map(
                              (e) => DropdownMenuItem(value: e, child: Text(e)),
                            )
                            .toList(),
                        onChanged: (v) => _gender = v,
                        validator: (v) => v == null ? "Select gender" : null,
                      ),

                      const SizedBox(height: 12),

                      // Blood Group
                      _label("Blood Group"),
                      DropdownButtonFormField(
                        decoration: _inputDecoration("Select"),
                        items: _bloodOptions
                            .map(
                              (e) => DropdownMenuItem(value: e, child: Text(e)),
                            )
                            .toList(),
                        onChanged: (v) => _bloodGroup = v,
                        validator: (v) =>
                            v == null ? "Select blood group" : null,
                      ),

                      const SizedBox(height: 12),

                      // Phone (enabled for user input)
                      _label("Phone Number"),
                      TextFormField(
                        controller: _phoneController,
                        decoration: _inputDecoration("Enter phone number"),
                      ),

                      const SizedBox(height: 12),

                      // Email (optional)
                      _label("Email"),
                      TextFormField(
                        controller: _emailController,
                        decoration: _inputDecoration("Optional"),
                      ),

                      const SizedBox(height: 12),

                      // Address
                      _label("Address"),
                      TextFormField(
                        controller: _addressController,
                        maxLines: 3,
                        decoration: _inputDecoration("Enter address"),
                      ),

                      const SizedBox(height: 16),

                      // Save
                      ElevatedButton(
                        onPressed: _saveAndContinue,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE63946),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          "Save & Continue",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Helpers
  Widget _label(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        color: Color(0xFF1D3557),
      ),
    ),
  );

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: const Color(0xFFF8F9FA),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDEE3EA)),
      ),
    );
  }
}
