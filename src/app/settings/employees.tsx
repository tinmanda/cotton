import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS } from "@/constants";
import { FinanceService } from "@/services";
import { IEmployee, IProject } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatSalary(amount: number, currency: string): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}/mo`;
  }
  return `₹${amount.toLocaleString("en-IN")}/mo`;
}

export default function EmployeesScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [projects, setProjects] = useState<IProject[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [empResult, projResult] = await Promise.all([
        FinanceService.getEmployees(),
        FinanceService.getProjects(),
      ]);
      if (empResult.success) setEmployees(empResult.data);
      else showError(empResult.error.message);
      if (projResult.success) setProjects(projResult.data);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(false);
  }, [loadData]);

  // Group employees by project
  const employeesByProject = employees.reduce(
    (acc, emp) => {
      const projectName = emp.projectName || "Unassigned";
      if (!acc[projectName]) acc[projectName] = [];
      acc[projectName].push(emp);
      return acc;
    },
    {} as Record<string, IEmployee[]>
  );

  const totalMonthlySalary = employees.reduce((sum, e) => sum + e.monthlySalary, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Lucide name="chevron-left" size={24} color={COLORS.gray600} />
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-gray-900">Employees</Text>
            <Text className="text-xs text-gray-500">
              {employees.length} team members
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
          className="rounded-full"
        >
          <Lucide name="plus" size={20} color={COLORS.white} />
        </Pressable>
      </View>

      {/* Total Salary */}
      {employees.length > 0 && (
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-500">Total Monthly Salary</Text>
            <Text className="text-lg font-bold text-gray-900">
              ₹{totalMonthlySalary.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.emptyState} className="mx-4 mt-6 bg-white rounded-2xl p-8 items-center">
          <View style={styles.emptyIconBg}>
            <Lucide name="users" size={32} color={COLORS.gray400} />
          </View>
          <Text className="text-base font-medium text-gray-700 mt-4">
            No employees yet
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            Add team members to track salary expenses
          </Text>
          {projects.length > 0 ? (
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={styles.emptyButton}
              className="mt-4 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Add Employee</Text>
            </Pressable>
          ) : (
            <Text className="text-xs text-gray-400 mt-4">
              Create a project first to add employees
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={Object.entries(employeesByProject)}
          keyExtractor={([projectName]) => projectName}
          renderItem={({ item: [projectName, emps] }) => (
            <View className="mt-4">
              <Text className="px-4 text-xs font-semibold text-gray-500 uppercase mb-2">
                {projectName}
              </Text>
              <View style={styles.sectionCard} className="mx-4 bg-white rounded-2xl overflow-hidden">
                {emps.map((employee, index) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    isLast={index === emps.length - 1}
                  />
                ))}
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AddEmployeeModal
        visible={showAddModal}
        projects={projects}
        onClose={() => setShowAddModal(false)}
        onCreated={() => {
          setShowAddModal(false);
          loadData();
          showSuccess("Employee added");
        }}
      />
    </SafeAreaView>
  );
}

function EmployeeRow({
  employee,
  isLast,
}: {
  employee: IEmployee;
  isLast: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <View style={styles.employeeIcon}>
        <Lucide name="user" size={18} color={COLORS.primary} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-sm font-semibold text-gray-900">{employee.name}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{employee.role}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold text-gray-900">
          {formatSalary(employee.monthlySalary, employee.currency)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                employee.status === "active" ? `${COLORS.success}15` : `${COLORS.gray400}15`,
            },
          ]}
          className="px-2 py-0.5 rounded-full mt-1"
        >
          <Text
            className="text-xs font-medium capitalize"
            style={{
              color: employee.status === "active" ? COLORS.success : COLORS.gray500,
            }}
          >
            {employee.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AddEmployeeModal({
  visible,
  projects,
  onClose,
  onCreated,
}: {
  visible: boolean;
  projects: IProject[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [salary, setSalary] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (visible && projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [visible, projects, projectId]);

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      showError("Name must be at least 2 characters");
      return;
    }
    if (!role.trim()) {
      showError("Role is required");
      return;
    }
    if (!projectId) {
      showError("Please select a project");
      return;
    }
    const salaryNum = parseFloat(salary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      showError("Please enter a valid salary");
      return;
    }

    setIsCreating(true);
    try {
      const result = await FinanceService.createEmployee({
        name: name.trim(),
        role: role.trim(),
        projectId,
        monthlySalary: salaryNum,
      });

      if (result.success) {
        setName("");
        setRole("");
        setSalary("");
        onCreated();
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const isValid = name.trim().length >= 2 && role.trim() && projectId && parseFloat(salary) > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">Add Employee</Text>
          <Pressable
            onPress={handleCreate}
            disabled={isCreating || !isValid}
            className="px-2 py-1"
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  isValid ? "text-primary" : "text-gray-300"
                }`}
              >
                Add
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Name */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Name</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., John Doe"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="words"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          {/* Role */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Role</Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4">
              <TextInput
                value={role}
                onChangeText={setRole}
                placeholder="e.g., Developer, Designer"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="words"
                style={{ fontSize: 16, color: COLORS.gray900 }}
              />
            </View>
          </View>

          {/* Project */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">Project</Text>
            <View className="flex-row flex-wrap gap-2">
              {projects.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setProjectId(p.id)}
                  style={[
                    styles.projectChip,
                    projectId === p.id && styles.projectChipSelected,
                  ]}
                  className="flex-row items-center px-4 py-2.5 rounded-xl"
                >
                  <View
                    style={{ backgroundColor: p.color, width: 10, height: 10, borderRadius: 5 }}
                    className="mr-2"
                  />
                  <Text
                    className={`text-sm font-medium ${
                      projectId === p.id ? "text-primary" : "text-gray-600"
                    }`}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Salary */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-500 mb-2">
              Monthly Salary (₹)
            </Text>
            <View className="bg-gray-100 rounded-xl px-4 py-4 flex-row items-center">
              <Text className="text-gray-500 mr-1">₹</Text>
              <TextInput
                value={salary}
                onChangeText={setSalary}
                placeholder="50000"
                placeholderTextColor={COLORS.gray400}
                keyboardType="numeric"
                style={{ fontSize: 16, color: COLORS.gray900, flex: 1 }}
              />
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
  sectionCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  employeeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {},
  projectChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  projectChipSelected: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
});
