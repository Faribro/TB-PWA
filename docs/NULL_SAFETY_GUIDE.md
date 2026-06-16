# 🛡️ SAMADHAAN Null-Safety Quick Reference

## 🎯 The Golden Rule

**ALWAYS check for null/undefined before accessing object properties in loops**

```typescript
// ❌ WRONG - Will crash if patient is null
for (let i = 0; i < patients.length; i++) {
  const patient = patients[i];
  if (patient.screening_state) { ... }  // CRASH!
}

// ✅ CORRECT - Safe null handling
for (let i = 0; i < patients.length; i++) {
  const patient = patients[i];
  if (!patient) continue;  // Skip null entries
  if (patient.screening_state) { ... }  // Safe
}
```

---

## 📋 Null-Safety Checklist

### Before Writing Any Loop

- [ ] Check if array exists: `if (!array?.length) return [];`
- [ ] Guard each iteration: `if (!item) continue;`
- [ ] Use optional chaining: `item?.property`
- [ ] Provide fallbacks: `item?.property || 'default'`

### Before Accessing Nested Properties

- [ ] Check parent exists: `if (!patient) return null;`
- [ ] Use optional chaining: `patient?.screening_state`
- [ ] Provide defaults: `patient?.screening_state || 'Unknown'`

### Before Rendering Data

- [ ] Check data exists: `if (!data) return <EmptyState />;`
- [ ] Check array length: `if (!data.length) return <EmptyState />;`
- [ ] Guard map operations: `data?.map(item => item && <Component />)`

---

## 🔧 Common Patterns

### Pattern 1: Safe Array Iteration

```typescript
const processPatients = useMemo(() => {
  // Layer 1: Check array exists
  if (!patients?.length) return [];
  
  const result = [];
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    
    // Layer 2: Check element exists
    if (!patient) continue;
    
    // Layer 3: Safe property access
    if (patient.screening_state) {
      result.push(patient);
    }
  }
  return result;
}, [patients]);
```

### Pattern 2: Safe Object Access

```typescript
const getPatientState = (patient: any) => {
  // Guard against null patient
  if (!patient) return 'Unknown';
  
  // Use optional chaining + fallback
  return patient?.screening_state || 'Unknown';
};
```

### Pattern 3: Safe Rendering

```typescript
function PatientList({ patients }: { patients: any[] }) {
  // Guard 1: Check array exists
  if (!patients) return <EmptyState message="No data" />;
  
  // Guard 2: Check array has items
  if (!patients.length) return <EmptyState message="No patients" />;
  
  // Guard 3: Filter out null entries before mapping
  return (
    <div>
      {patients
        .filter(p => p !== null && p !== undefined)
        .map(patient => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
    </div>
  );
}
```

---

## 🚨 Red Flags to Watch For

### 🔴 Direct Property Access in Loops

```typescript
// ❌ DANGER
patients.forEach(p => {
  console.log(p.screening_state);  // Will crash if p is null
});

// ✅ SAFE
patients.forEach(p => {
  if (!p) return;
  console.log(p.screening_state);
});
```

### 🔴 Assuming Array Elements Exist

```typescript
// ❌ DANGER
const firstPatient = patients[0];
console.log(firstPatient.name);  // Crash if array is empty or element is null

// ✅ SAFE
const firstPatient = patients?.[0];
if (firstPatient) {
  console.log(firstPatient.name);
}
```

### 🔴 Nested Property Access

```typescript
// ❌ DANGER
const district = patient.location.district;  // Crash if location is null

// ✅ SAFE
const district = patient?.location?.district || 'Unknown';
```

---

## 🎓 TypeScript Tips

### Use Strict Null Checks

```json
// tsconfig.json
{
  "compilerOptions": {
    "strictNullChecks": true,  // Enforces null safety at compile time
    "strict": true
  }
}
```

### Define Proper Types

```typescript
// ❌ WEAK TYPING
interface Patient {
  screening_state: string;  // Doesn't allow null
}

// ✅ STRONG TYPING
interface Patient {
  screening_state: string | null;  // Explicitly allows null
}

// ✅ EVEN BETTER
interface Patient {
  screening_state?: string;  // Optional property
}
```

### Use Type Guards

```typescript
function isValidPatient(patient: any): patient is Patient {
  return (
    patient !== null &&
    patient !== undefined &&
    typeof patient.screening_state === 'string'
  );
}

// Usage
if (isValidPatient(patient)) {
  // TypeScript knows patient is valid here
  console.log(patient.screening_state);
}
```

---

## 🧪 Testing Null Scenarios

### Unit Test Template

```typescript
describe('Patient Processing', () => {
  it('should handle null patients gracefully', () => {
    const patients = [
      { id: 1, screening_state: 'Maharashtra' },
      null,  // Null entry
      { id: 2, screening_state: 'Gujarat' },
      undefined,  // Undefined entry
    ];
    
    const result = processPatients(patients);
    
    // Should skip null/undefined entries
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });
  
  it('should handle empty array', () => {
    const result = processPatients([]);
    expect(result).toEqual([]);
  });
  
  it('should handle null array', () => {
    const result = processPatients(null);
    expect(result).toEqual([]);
  });
});
```

---

## 📚 Resources

- [TypeScript Handbook: Null and Undefined](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#null-and-undefined)
- [MDN: Optional Chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

---

## 🆘 When in Doubt

**Ask yourself these 3 questions:**

1. **Can this value be null?** → Add null check
2. **Am I iterating an array?** → Guard each element
3. **Am I accessing nested properties?** → Use optional chaining

**If you answer "yes" to any, add null guards!**

---

**Last Updated**: 2025-01-21  
**Maintained By**: Senior Architecture Team
