import { useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  contactsAtom,
  contactsLoadingAtom,
  contactsTimestampAtom,
  categoriesAtom,
  categoriesLoadingAtom,
  categoriesTimestampAtom,
  projectsAtom,
  projectsLoadingAtom,
  projectsTimestampAtom,
  CACHE_TTL,
} from "./atoms";
import { FinanceService } from "@/services";
import { IContact, ICategory, IProject } from "@/types";

/**
 * Hook for managing contacts with caching
 * Returns contacts data and utility functions
 */
export function useContacts() {
  const [contacts, setContacts] = useAtom(contactsAtom);
  const [isLoading, setIsLoading] = useAtom(contactsLoadingAtom);
  const [timestamp, setTimestamp] = useAtom(contactsTimestampAtom);

  const isCacheValid = useCallback(() => {
    return timestamp > 0 && Date.now() - timestamp < CACHE_TTL;
  }, [timestamp]);

  const fetchContacts = useCallback(
    async (force = false) => {
      // Skip if cache is valid and not forcing refresh
      if (!force && isCacheValid() && contacts.length > 0) {
        return { success: true, data: contacts };
      }

      setIsLoading(true);
      try {
        const result = await FinanceService.getContacts({});
        if (result.success) {
          setContacts(result.data);
          setTimestamp(Date.now());
          return { success: true, data: result.data };
        }
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [contacts, isCacheValid, setContacts, setIsLoading, setTimestamp]
  );

  const invalidateContacts = useCallback(() => {
    setTimestamp(0);
  }, [setTimestamp]);

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
 * Hook for managing categories with caching
 */
export function useCategories() {
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [isLoading, setIsLoading] = useAtom(categoriesLoadingAtom);
  const [timestamp, setTimestamp] = useAtom(categoriesTimestampAtom);

  const isCacheValid = useCallback(() => {
    return timestamp > 0 && Date.now() - timestamp < CACHE_TTL;
  }, [timestamp]);

  const fetchCategories = useCallback(
    async (force = false) => {
      // Skip if cache is valid and not forcing refresh
      if (!force && isCacheValid() && categories.length > 0) {
        return { success: true, data: categories };
      }

      setIsLoading(true);
      try {
        const result = await FinanceService.getCategories();
        if (result.success) {
          setCategories(result.data);
          setTimestamp(Date.now());
          return { success: true, data: result.data };
        }
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [categories, isCacheValid, setCategories, setIsLoading, setTimestamp]
  );

  const invalidateCategories = useCallback(() => {
    setTimestamp(0);
  }, [setTimestamp]);

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
 * Hook for managing projects with caching
 */
export function useProjects() {
  const [projects, setProjects] = useAtom(projectsAtom);
  const [isLoading, setIsLoading] = useAtom(projectsLoadingAtom);
  const [timestamp, setTimestamp] = useAtom(projectsTimestampAtom);

  const isCacheValid = useCallback(() => {
    return timestamp > 0 && Date.now() - timestamp < CACHE_TTL;
  }, [timestamp]);

  const fetchProjects = useCallback(
    async (force = false) => {
      // Skip if cache is valid and not forcing refresh
      if (!force && isCacheValid() && projects.length > 0) {
        return { success: true, data: projects };
      }

      setIsLoading(true);
      try {
        const result = await FinanceService.getProjects();
        if (result.success) {
          setProjects(result.data);
          setTimestamp(Date.now());
          return { success: true, data: result.data };
        }
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [projects, isCacheValid, setProjects, setIsLoading, setTimestamp]
  );

  const invalidateProjects = useCallback(() => {
    setTimestamp(0);
  }, [setTimestamp]);

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
