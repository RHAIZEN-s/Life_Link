import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class LocalUserService {
  // ------------------------------------------------------------
  // SAVE USER LOCALLY AFTER LOGIN / INITIAL PROFILE
  // ------------------------------------------------------------
  static Future<void> saveUser(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString('fullName', user.fullName);
    await prefs.setString('bloodGroup', user.bloodGroup);
    await prefs.setInt('donations', user.donations);
  }

  // ------------------------------------------------------------
  // GET USER IF EXISTS (returns null if not found)
  // ------------------------------------------------------------
  static Future<UserModel?> getUserOrNull() async {
    final prefs = await SharedPreferences.getInstance();

    if (!prefs.containsKey('fullName')) {
      return null;
    }

    return UserModel(
      fullName: prefs.getString('fullName') ?? "",
      bloodGroup: prefs.getString('bloodGroup') ?? "A+",
      donations: prefs.getInt('donations') ?? 0,
    );
  }

  // ------------------------------------------------------------
  // UPDATE USER (for Edit Profile Page)
  // ------------------------------------------------------------
  static Future<void> updateUser(UserModel user) async {
    await saveUser(user);
  }

  // ------------------------------------------------------------
  // CLEAR USER (optional logout or reset)
  // ------------------------------------------------------------
  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  // ------------------------------------------------------------
  // SAVE EMAIL LOCALLY
  // ------------------------------------------------------------
  static Future<void> saveEmail(String email) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('email', email);
  }

  // ------------------------------------------------------------
  // GET EMAIL IF EXISTS (returns null if not found)
  // ------------------------------------------------------------
  static Future<String?> getEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('email');
  }
}
