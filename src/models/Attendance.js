import mongoose from 'mongoose';

const AttendanceRecordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    required: true,
  },
}, { _id: false });

const AttendanceSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
    index: true,
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  records: [AttendanceRecordSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
