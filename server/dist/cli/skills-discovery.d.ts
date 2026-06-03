export type SkillCategory = 'core' | 'productivity' | 'marketing' | 'life';
export interface SkillMeta {
    name: string;
    description: string;
    category: SkillCategory;
    path: string;
}
/** Resolve the bundled `skills/` directory relative to the CLI dist. */
export declare function getSkillsSource(): string;
export declare function discoverBundledSkills(sourceDir?: string): SkillMeta[];
