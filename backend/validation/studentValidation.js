/*
 * validation/studentValidation.js
 * ================================
 * Input validation for student reservation requests.
 */

const BRANCHES = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication Engineering',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Biotechnology',
    'Physics',
    'Mathematics',
    'Other',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

function validateStudentData(data) {
    const errors = [];

    // Full name
    if (!data.full_name || typeof data.full_name !== 'string') {
        errors.push('Full name is required.');
    } else if (data.full_name.trim().length < 2) {
        errors.push('Full name must be at least 2 characters.');
    } else if (data.full_name.trim().length > 100) {
        errors.push('Full name must not exceed 100 characters.');
    } else if (!/^[a-zA-Z\s.'-]+$/.test(data.full_name.trim())) {
        errors.push('Full name may only contain letters, spaces, hyphens, apostrophes, and periods.');
    }

    // Roll number
    if (!data.roll_number || typeof data.roll_number !== 'string') {
        errors.push('College roll number is required.');
    } else if (!/^[A-Za-z0-9/-]{4,20}$/.test(data.roll_number.trim())) {
        errors.push('Roll number must be 4–20 alphanumeric characters (hyphens and slashes allowed).');
    }

    // Email
    if (!data.email || typeof data.email !== 'string') {
        errors.push('College email address is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) {
        errors.push('Please enter a valid email address.');
    } else if (data.email.trim().length > 150) {
        errors.push('Email address must not exceed 150 characters.');
    }

    // Mobile
    if (!data.mobile || typeof data.mobile !== 'string') {
        errors.push('Mobile number is required.');
    } else if (!/^[6-9]\d{9}$/.test(data.mobile.trim())) {
        errors.push('Mobile number must be a valid 10-digit Indian mobile number starting with 6–9.');
    }

    // Department
    if (!data.department || typeof data.department !== 'string') {
        errors.push('Department is required.');
    } else if (data.department.trim().length < 2 || data.department.trim().length > 100) {
        errors.push('Department name must be 2–100 characters.');
    }

    // Academic year
    if (!data.academic_year || typeof data.academic_year !== 'string') {
        errors.push('Academic year is required.');
    } else if (!YEARS.includes(data.academic_year.trim())) {
        errors.push(`Academic year must be one of: ${YEARS.join(', ')}.`);
    }

    return errors;
}

function validateReservationRequest(data) {
    const errors = [];

    if (!data.room_id || typeof data.room_id !== 'string') {
        errors.push('Room ID is required.');
    } else if (!/^(AC|NAC)-[1-6]\d{2}$/.test(data.room_id.trim())) {
        errors.push('Invalid room ID format.');
    }

    const studentErrors = validateStudentData(data);
    return [...errors, ...studentErrors];
}

module.exports = { validateStudentData, validateReservationRequest, BRANCHES, YEARS };
