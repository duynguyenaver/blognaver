"""Offline regression tests for Korean Samsung-style CV spreadsheet parsing."""
import importlib.util
import pathlib
import unittest

TARGET = pathlib.Path(__file__).with_name("sync-don-xin-viec.py")
SPEC = importlib.util.spec_from_file_location("resume_sync", TARGET)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class SamsungCVSyncTests(unittest.TestCase):
    def value_ranges(self):
        profile = [["TRƯỜNG THÔNG TIN", "NỘI DUNG · NHẬP TẠI CỘT B"]]
        profile += [[label, ""] for label, _ in mod.PROFILE_KEYS]
        tables = [[headers.copy()] for headers, _ in mod.TABLES.values()]
        return [{"values": profile}] + [{"values": table} for table in tables]

    def test_empty_source_keeps_all_sections(self):
        data = mod.parse_response(self.value_ranges())
        self.assertEqual(data["version"], 1)
        self.assertEqual(data["profile"]["fullName"], "")
        self.assertEqual(len(data["KinhNghiem"]), 0)
        self.assertEqual(len(data["NghienCuu"]), 0)

    def test_every_field_changes_source_fingerprint(self):
        ranges = self.value_ranges()
        original = mod.canonical(mod.parse_response(ranges))
        ranges[0]["values"][6][1] = "0912345678"
        edited = mod.canonical(mod.parse_response(ranges))
        self.assertNotEqual(original, edited)
        ranges[0]["values"][6][1] = ""
        ranges[2]["values"].append(["2025.01", "Nay", "Công ty", "Planner", "Nhân viên", "CNC", "Mô tả"])
        edited_experience = mod.canonical(mod.parse_response(ranges))
        self.assertNotEqual(original, edited_experience)

    def test_reject_mutated_header(self):
        ranges = self.value_ranges()
        ranges[2]["values"][0][0] = "From date"
        with self.assertRaises(mod.SyncError):
            mod.parse_response(ranges)

    def test_reject_duplicate_profile_label(self):
        ranges = self.value_ranges()
        ranges[0]["values"].append(["Họ tên", "Ghi đè"])
        with self.assertRaises(mod.SyncError):
            mod.parse_response(ranges)

    def test_encrypt_has_no_plaintext_and_is_random(self):
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        from hashlib import pbkdf2_hmac
        import base64
        data = self.value_ranges()
        data[0]["values"][1][1] = "DỮ LIỆU BÍ MẬT"
        payload = mod.parse_response(data)
        password = "test-secret-super-long-123"
        envelope = mod.encrypt(payload, password)
        envelope2 = mod.encrypt(payload, password)
        self.assertNotIn("DỮ LIỆU BÍ MẬT", mod.canonical(envelope).decode())
        self.assertNotEqual(envelope["ciphertext"], envelope2["ciphertext"])
        salt = base64.b64decode(envelope["salt"])
        nonce = base64.b64decode(envelope["nonce"])
        key = pbkdf2_hmac("sha256", password.encode(), salt, envelope["iterations"], 32)
        restored = AESGCM(key).decrypt(nonce, base64.b64decode(envelope["ciphertext"]), None)
        self.assertEqual(restored, mod.canonical(payload))


if __name__ == "__main__":
    unittest.main()
