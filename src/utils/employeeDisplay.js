export function getEmployeeDisplayId(employee) {
  const employeeId = employee?.employeeId || employee?.id || "";
  const uid = employee?.uid || "";

  if (!employeeId || employeeId === uid || /^[A-Za-z0-9_-]{20,}$/.test(employeeId)) {
    return "Employee ID not set";
  }

  return employeeId;
}
