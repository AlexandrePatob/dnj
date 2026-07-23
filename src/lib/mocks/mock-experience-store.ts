import { createMockExperienceRepositories } from "./mock-experience-repositories";

// The mock API needs one process-wide source of truth so its routes can model a
// complete QR -> moment -> gallery journey. Production will replace this with
// the remote repositories.
export const mockExperienceRepositories = createMockExperienceRepositories();
