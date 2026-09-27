import { isAllowedCollegeEmail, isVerifiedCollegeGoogleAccount, getAllowedCollegeDomains } from '../utils/emailValidator';

describe('College Email & Google Verification Helper', () => {
  const originalEnv = process.env.COLLEGE_EMAIL_DOMAINS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.COLLEGE_EMAIL_DOMAINS = originalEnv;
    } else {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
    }
  });

  describe('isAllowedCollegeEmail', () => {
    it('allows emails belonging to default college domain (vectorone.edu)', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@vectorone.edu')).toBe(true);
      expect(isAllowedCollegeEmail('faculty.member@VECTORONE.EDU')).toBe(true);
    });

    it('rejects personal and public email domains', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@gmail.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@yahoo.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@outlook.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@hotmail.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@icloud.com')).toBe(false);
    });

    it('prevents substring spoofing attacks', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@vectorone.edu.malicious.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@fake-vectorone.edu')).toBe(false);
      expect(isAllowedCollegeEmail('vectorone.edu@gmail.com')).toBe(false);
    });

    it('supports multiple configured college domains via COLLEGE_EMAIL_DOMAINS', () => {
      process.env.COLLEGE_EMAIL_DOMAINS = 'campus.edu, student.campus.edu, med.campus.edu';
      expect(getAllowedCollegeDomains()).toEqual(['campus.edu', 'student.campus.edu', 'med.campus.edu']);
      expect(isAllowedCollegeEmail('john@campus.edu')).toBe(true);
      expect(isAllowedCollegeEmail('jane@student.campus.edu')).toBe(true);
      expect(isAllowedCollegeEmail('dr.smith@med.campus.edu')).toBe(true);
      expect(isAllowedCollegeEmail('hacker@other.edu')).toBe(false);
    });
  });

  describe('isVerifiedCollegeGoogleAccount', () => {
    it('accepts verified accounts with an allowed college domain', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'student@vectorone.edu',
        email_verified: true,
      });
      expect(res.allowed).toBe(true);
    });

    it('rejects unverified Google accounts even if email domain is college', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'student@vectorone.edu',
        email_verified: false,
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/verified college email/i);
    });

    it('rejects verified Google accounts if email is from personal domain like gmail', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'student@gmail.com',
        email_verified: true,
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/verified college email/i);
    });
  });
});
