import { useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { IContact, ICategory, IProject } from "@/types";

// Import from the new data layer
import {
  contactsAtom,
  categoriesAtom,
  projectsAtom,
  contactsLoadingAtom,
  categoriesLoadingAtom,
  projectsLoadingAtom,
  loadContactsAtom,
  loadCategoriesAtom,
  loadProjectsAtom,
} from "@/data/atoms";

import {
  getAllContacts,
  createContact as createContactRepo,
  updateContact as updateContactRepo,
  deleteContact as deleteContactRepo,
} from "@/data/database/repositories/contacts";

import {
  getAllCategories,
  createCategory as createCategoryRepo,
  updateCategory as updateCategoryRepo,
  deleteCategory as deleteCategoryRepo,
} from "@/data/database/repositories/categories";

import {
  getAllProjects,
  createProject as createProjectRepo,
  updateProject as updateProjectRepo,
  deleteProject as deleteProjectRepo,
} from "@/data/database/repositories/projects";

/**
 * Hook for managing contacts with SQLite
 * Returns contacts data and utility functions
 */
export function useContacts() {
  const [contacts, setContacts] = useAtom(contactsAtom);
  const [isLoading, setIsLoading] = useAtom(contactsLoadingAtom);
  const reloadContacts = useSetAtom(loadContactsAtom);

  const fetchContacts = useCallback(
    async (force = false) => {
      // In local-first, just reload from SQLite
      if (force || contacts.length === 0) {
        setIsLoading(true);
        try {
          const freshContacts = getAllContacts();
          setContacts(freshContacts);
          return { success: true, data: freshContacts };
        } finally {
          setIsLoading(false);
        }
      }
      return { success: true, data: contacts };
    },
    [contacts, setContacts, setIsLoading]
  );

  const invalidateContacts = useCallback(() => {
    reloadContacts();
  }, [reloadContacts]);

  const updateContact = useCallback(
    (updatedContact: IContact) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === updatedContact.id ? updatedContact : c))
      );
    },
    [setContacts]
  );

  const addContact = useCallback(
    (newContact: IContact) => {
      setContacts((prev) => [newContact, ...prev]);
    },
    [setContacts]
  );

  const removeContact = useCallback(
    (contactId: string) => {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    },
    [setContacts]
  );

  // Always valid in local-first (data is on device)
  const isCacheValid = useCallback(() => true, []);

  return {
    contacts,
    isLoading,
    fetchContacts,
    invalidateContacts,
    updateContact,
    addContact,
    removeContact,
    isCacheValid,
  };
}

/**
 * Hook for managing categories with SQLite
 */
export function useCategories() {
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [isLoading, setIsLoading] = useAtom(categoriesLoadingAtom);
  const reloadCategories = useSetAtom(loadCategoriesAtom);

  const fetchCategories = useCallback(
    async (force = false) => {
      if (force || categories.length === 0) {
        setIsLoading(true);
        try {
          const freshCategories = getAllCategories();
          setCategories(freshCategories);
          return { success: true, data: freshCategories };
        } finally {
          setIsLoading(false);
        }
      }
      return { success: true, data: categories };
    },
    [categories, setCategories, setIsLoading]
  );

  const invalidateCategories = useCallback(() => {
    reloadCategories();
  }, [reloadCategories]);

  const updateCategory = useCallback(
    (updatedCategory: ICategory) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
      );
    },
    [setCategories]
  );

  const addCategory = useCallback(
    (newCategory: ICategory) => {
      setCategories((prev) => [newCategory, ...prev]);
    },
    [setCategories]
  );

  const removeCategory = useCallback(
    (categoryId: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    },
    [setCategories]
  );

  const isCacheValid = useCallback(() => true, []);

  return {
    categories,
    isLoading,
    fetchCategories,
    invalidateCategories,
    updateCategory,
    addCategory,
    removeCategory,
    isCacheValid,
  };
}

/**
 * Hook for managing projects with SQLite
 */
export function useProjects() {
  const [projects, setProjects] = useAtom(projectsAtom);
  const [isLoading, setIsLoading] = useAtom(projectsLoadingAtom);
  const reloadProjects = useSetAtom(loadProjectsAtom);

  const fetchProjects = useCallback(
    async (force = false) => {
      if (force || projects.length === 0) {
        setIsLoading(true);
        try {
          const freshProjects = getAllProjects();
          setProjects(freshProjects);
          return { success: true, data: freshProjects };
        } finally {
          setIsLoading(false);
        }
      }
      return { success: true, data: projects };
    },
    [projects, setProjects, setIsLoading]
  );

  const invalidateProjects = useCallback(() => {
    reloadProjects();
  }, [reloadProjects]);

  const updateProject = useCallback(
    (updatedProject: IProject) => {
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
    },
    [setProjects]
  );

  const addProject = useCallback(
    (newProject: IProject) => {
      setProjects((prev) => [newProject, ...prev]);
    },
    [setProjects]
  );

  const removeProject = useCallback(
    (projectId: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    },
    [setProjects]
  );

  const isCacheValid = useCallback(() => true, []);

  return {
    projects,
    isLoading,
    fetchProjects,
    invalidateProjects,
    updateProject,
    addProject,
    removeProject,
    isCacheValid,
  };
}

/**
 * Convenience hook to get just the contacts data (read-only)
 */
export function useContactsData() {
  return useAtomValue(contactsAtom);
}

/**
 * Convenience hook to get just the categories data (read-only)
 */
export function useCategoriesData() {
  return useAtomValue(categoriesAtom);
}

/**
 * Convenience hook to get just the projects data (read-only)
 */
export function useProjectsData() {
  return useAtomValue(projectsAtom);
}
