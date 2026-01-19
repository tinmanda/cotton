import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS, buildRoute } from "@/constants";
import { FinanceService } from "@/services";
import { IProject, ProjectType } from "@/types";
import { useToast } from "@/hooks/useToast";

const PROJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
  "#10B981", "#06B6D4", "#6366F1", "#14B8A6", "#84CC16",
];

const PROJECT_TYPES: { value: ProjectType; label: string; icon: string }[] = [
  { value: "service", label: "Service", icon: "briefcase" },
  { value: "product", label: "Product", icon: "package" },
  { value: "investment", label: "Investment", icon: "trending-up" },
  { value: "other", label: "Other", icon: "folder" },
];

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ProjectsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [projects, setProjects] = useState<IProject[]>([]);
  const [projectSummaries, setProjectSummaries] = useState<Record<string, { income: number; expenses: number; net: number }>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  const loadProjects = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [projectsResult, dashboardResult] = await Promise.all([
        FinanceService.getProjects(),
        FinanceService.getDashboard(),
      ]);

      if (projectsResult.success) {
        setProjects(projectsResult.data);
      } else {
        showError(projectsResult.error.message);
      }

      if (dashboardResult.success && dashboardResult.data.projectSummaries) {
        const summaries: Record<string, { income: number; expenses: number; net: number }> = {};
        for (const ps of dashboardResult.data.projectSummaries) {
          summaries[ps.id] = { income: ps.income, expenses: ps.expenses, net: ps.net };
        }
        setProjectSummaries(summaries);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [loadProjects])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadProjects(false);
  }, [loadProjects]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Projects</Text>
          <Text className="text-sm text-gray-500 mt-0.5">
            Your business ventures
          </Text>
        </View>
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
          className="rounded-full"
        >
          <Lucide name="plus" size={20} color={COLORS.white} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {projects.length === 0 ? (
          <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
            <View style={styles.emptyIconBg}>
              <Lucide name="folder-plus" size={32} color={COLORS.gray400} />
            </View>
            <Text className="text-base font-medium text-gray-700 mt-4">
              No projects yet
            </Text>
            <Text className="text-sm text-gray-500 text-center mt-1">
              Create your first project to start tracking expenses
            </Text>
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={styles.emptyButton}
              className="mt-4 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Create Project</Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-4 pt-4 pb-6">
            {projects.map((project) => {
              const summary = projectSummaries[project.id];
              return (
                <Pressable
                  key={project.id}
                  onPress={() => router.push(buildRoute.projectDetail(project.id))}
                  style={styles.projectCard}
                  className="bg-white rounded-2xl p-4 mb-3 active:opacity-80"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        style={[styles.projectIcon, { backgroundColor: `${project.color}20` }]}
                      >
                        <Lucide
                          name={
                            project.type === "service"
                              ? "briefcase"
                              : project.type === "product"
                                ? "package"
                                : project.type === "investment"
                                  ? "trending-up"
                                  : "folder"
                          }
                          size={18}
                          color={project.color}
                        />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-base font-semibold text-gray-900">
                          {project.name}
                        </Text>
                        <Text className="text-xs text-gray-500 capitalize mt-0.5">
                          {project.type}
                        </Text>
                      </View>
                    </View>
                    <Lucide name="chevron-right" size={20} color={COLORS.gray400} />
                  </View>

                  {summary && (
                    <View className="flex-row mt-4 pt-3 border-t border-gray-100">
                      <View className="flex-1">
                        <Text className="text-xs text-gray-500">Income</Text>
                        <Text className="text-sm font-semibold text-success mt-0.5">
                          {formatAmount(summary.income)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs text-gray-500">Expenses</Text>
                        <Text className="text-sm font-semibold text-error mt-0.5">
                          {formatAmount(summary.expenses)}
                        </Text>
                      </View>
                      <View className="flex-1 items-end">
                        <Text className="text-xs text-gray-500">Net</Text>
                        <Text
                          className="text-sm font-semibold mt-0.5"
                          style={{ color: summary.net >= 0 ? COLORS.success : COLORS.error }}
                        >
                          {summary.net >= 0 ? "+" : ""}
                          {formatAmount(summary.net)}
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AddProjectModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          setShowAddModal(false);
          loadProjects();
          showSuccess("Project created");
        }}
      />
    </SafeAreaView>
  );
}

function AddProjectModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("service");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      showError("Name must be at least 2 characters");
      return;
    }

    setIsCreating(true);
    try {
      const result = await FinanceService.createProject({
        name: name.trim(),
        type,
        color,
      });

      if (result.success) {
        setName("");
        setType("service");
        setColor(PROJECT_COLORS[0]);
        onCreated();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">New Project</Text>
          <Pressable
            onPress={handleCreate}
            disabled={isCreating || name.trim().length < 2}
            className="px-2 py-1"
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  name.trim().length >= 2 ? "text-primary" : "text-gray-300"
                }`}
              >
                Create
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Name Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-500 mb-2">Project Name</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., TinMen, Consulting"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="words"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          {/* Type Selection */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-500 mb-3">Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {PROJECT_TYPES.map((pt) => (
                <Pressable
                  key={pt.value}
                  onPress={() => setType(pt.value)}
                  style={[
                    styles.typeChip,
                    type === pt.value && styles.typeChipSelected,
                  ]}
                  className="flex-row items-center px-4 py-2.5 rounded-xl"
                >
                  <Lucide
                    name={pt.icon as any}
                    size={16}
                    color={type === pt.value ? COLORS.primary : COLORS.gray500}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${
                      type === pt.value ? "text-primary" : "text-gray-600"
                    }`}
                  >
                    {pt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Color Selection */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-500 mb-3">Color</Text>
            <View className="flex-row flex-wrap gap-3">
              {PROJECT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotSelected,
                  ]}
                >
                  {color === c && (
                    <Lucide name="check" size={16} color={COLORS.white} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
  },
  projectCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  typeChipSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
