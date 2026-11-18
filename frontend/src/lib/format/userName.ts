function firstLetter(value: string): string {
  return Array.from(value.trim())[0]?.toLocaleUpperCase("pl-PL") ?? "";
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstLetter(firstName)}${firstLetter(lastName)}`;
}

export function getFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}
