// When creating employee:
await setDoc(doc(db, 'users', uid), {
  email,
  role: 'employee',
  name,
  trackingSchedule: {
    mon: { enabled: true, start: '07:00', end: '18:00' },
    tue: { enabled: true, start: '07:00', end: '18:00' },
    wed: { enabled: true, start: '07:00', end: '18:00' },
    thu: { enabled: true, start: '07:00', end: '18:00' },
    fri: { enabled: true, start: '07:00', end: '18:00' },
    sat: { enabled: false, start: '09:00', end: '17:00' },
    sun: { enabled: false, start: '09:00', end: '17:00' }
  }
});
