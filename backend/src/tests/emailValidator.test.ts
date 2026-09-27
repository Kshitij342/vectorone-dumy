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
    it('a) allows verified @tsecmumbai.in emails', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@tsecmumbai.in')).toBe(true);
      expect(isAllowedCollegeEmail('faculty.member@TSECMUMBAI.IN')).toBe(true);
      expect(isAllowedCollegeEmail('dept.head@student.tsecmumbai.in')).toBe(true);
    });

    it('b) allows verified .edu emails', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@vectorone.edu')).toBe(true);
      expect(isAllowedCollegeEmail('researcher@mit.edu')).toBe(true);
      expect(isAllowedCollegeEmail('scholar@stanford.edu')).toBe(true);
    });

    it('d) rejects @gmail.com accounts', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@gmail.com')).toBe(false);
      expect(isAllowedCollegeEmail('tsecmumbai.in@gmail.com')).toBe(false);
    });

    it('e) rejects other non-approved domains (Yahoo, Outlook, Hotmail, random)', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@yahoo.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@outlook.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@hotmail.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@icloud.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@random-domain.com')).toBe(false);
    });

    it('prevents substring spoofing attacks', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      expect(isAllowedCollegeEmail('student@tsecmumbai.in.attacker.com')).toBe(false);
      expect(isAllowedCollegeEmail('student@fake-tsecmumbai.in')).toBe(false);
    });

    it('supports custom environment variable COLLEGE_EMAIL_DOMAINS', () => {
      process.env.COLLEGE_EMAIL_DOMAINS = 'tsecmumbai.in, .edu';
      expect(getAllowedCollegeDomains()).toEqual(['tsecmumbai.in', '.edu']);
      expect(isAllowedCollegeEmail('john@tsecmumbai.in')).toBe(true);
      expect(isAllowedCollegeEmail('jane@college.edu')).toBe(true);
      expect(isAllowedCollegeEmail('hacker@other.com')).toBe(false);
    });
  });

  describe('isVerifiedCollegeGoogleAccount', () => {
    it('a) accepts verified Google account ending with @tsecmumbai.in', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'student@tsecmumbai.in',
        email_verified: true,
      });
      expect(res.allowed).toBe(true);
    });

    it('b) accepts verified Google account ending with .edu', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'student@college.edu',
        email_verified: true,
      });
      expect(res.allowed).toBe(true);
    });

    it('c) rejects unverified Google account ending with @tsecmumbai.in', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'student@tsecmumbai.in',
        email_verified: false,
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/Only verified college email addresses are allowed/i);
    });

    it('d) rejects verified @gmail.com Google account', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'user@gmail.com',
        email_verified: true,
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/Only verified college email addresses are allowed/i);
    });

    it('e) rejects other non-approved domain Google account', () => {
      delete process.env.COLLEGE_EMAIL_DOMAINS;
      const res = isVerifiedCollegeGoogleAccount({
        email: 'user@yahoo.com',
        email_verified: true,
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toMatch(/Only verified college email addresses are allowed/i);
    });
  });
});
