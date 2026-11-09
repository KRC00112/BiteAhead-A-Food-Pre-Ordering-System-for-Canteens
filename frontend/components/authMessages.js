function messageForValidationError(error) {
  const field = error.loc?.[error.loc.length - 1];
  const message = error.msg || "";

  if (field === "username" && message.includes("pattern")) {
    return "Username can only contain letters, numbers, underscores, and periods.";
  }
  if (field === "institute_id" && message.includes("pattern")) {
    return "Institute ID can only contain letters, numbers, underscores, and hyphens.";
  }
  if (field === "password" && message.includes("at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (field === "new_password" && message.includes("at least")) {
    return "New password must be at least 6 characters long.";
  }
  if (field === "email") {
    return "Enter a valid recovery email address.";
  }

  return message || "Please check the entered information.";
}

export function getAuthErrorMessage(data, fallback) {
  if (Array.isArray(data?.detail)) {
    return data.detail.map(messageForValidationError).join("\n");
  }
  if (typeof data?.detail === "string" && data.detail) {
    return data.detail;
  }
  return fallback;
}
