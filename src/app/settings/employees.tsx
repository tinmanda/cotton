import React, { useState, useCallback, useEffect } from "react";
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
import { IContact, IProject, EmployeeStatus, Currency } from "@/types";
import { useToast } from "@/hooks/useToast";

function formatSalary(amount: number | undefined, currency: Currency | undefined): string {
  if (!amount) return "Not set";
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
  const [employees, setEmployees] = useState<IContact[]>([]);
  const [projects, setProjects] = useState<IProject[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingEmployee, setEditingEmployee] = useState<IContact | undefined>();

  const openCreateModal = () => {
    setModalMode("create");
    setEditingEmployee(undefined);
    setModalVisible(true);
  };

  const openEditModal = (employee: IContact) => {
    setModalMode("edit");
    setEditingEmployee(employee);
    setModalVisible(true);
  };

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [empResult, projResult] = await Promise.all([
        FinanceService.getContacts({ type: "employee" }),
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
    {} as Record<string, IContact[]>
  );

  const totalMonthlySalary = employees.reduce((sum, e) => sum + (e.monthlySalary || 0), 0);

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
          onPress={openCreateModal}
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
              onPress={openCreateModal}
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
                    onPress={() => openEditModal(employee)}
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

      <EmployeeModal
        visible={modalVisible}
        mode={modalMode}
        employee={editingEmployee}
        projects={projects}
        onClose={() => setModalVisible(false)}
        onSaved={(isEdit) => {
          setModalVisible(false);
          loadData();
          showSuccess(isEdit ? "Employee updated" : "Employee added");
        }}
      />
    </SafeAreaView>
  );
}

function EmployeeRow({
  employee,
  isLast,
  onPress,
}: {
  employee: IContact;
  isLast: boolean;
  onPress: () => void;
}) {
  const status = employee.employeeStatus || "active";
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 active:bg-gray-50 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <View style={styles.employeeIcon}>
        <Lucide name="user" size={18} color={COLORS.primary} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-sm font-semibold text-gray-900">{employee.name}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{employee.role || "Employee"}</Text>
      </View>
      <View className="items-end">
        <Text className="text-sm font-semibold text-gray-900">
          {formatSalary(employee.monthlySalary, employee.salaryCurrency)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status === "active" ? `${COLORS.success}15` : `${COLORS.gray400}15`,
            },
          ]}
          className="px-2 py-0.5 rounded-full mt-1"
        >
          <Text
            className="text-xs font-medium capitalize"
            style={{
              color: status === "active" ? COLORS.success : COLORS.gray500,
            }}
          >
            {status}
          </Text>
        </View>
      </View>
      <Lucide name="chevron-right" size={16} color={COLORS.gray400} className="ml-2" />
    </Pressable>
  );
}

function EmployeeModal({
  visible,
  mode,
  employee,
  projects,
  onClose,
  onSaved,
}: {
  visible: boolean;
  mode: "create" | "edit";
  employee?: IContact;
  projects: IProject[];
  onClose: () => void;
  onSaved: (isEdit: boolean) => void;
}) {
  const { showError } = useToast();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [salary, setSalary] = useState("");
  const [status, setStatus] = useState<EmployeeStatus>("active");
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = mode === "edit";

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      if (isEdit && employee) {
        setName(employee.name);
        setRole(employee.role || "");
        setProjectId(employee.projectId);
        setSalary(employee.monthlySalary?.toString() || "");
        setStatus(employee.employeeStatus || "active");
      } else {
        setName("");
        setRole("");
        setProjectId(projects.length > 0 ? projects[0].id : undefined);
        setSalary("");
        setStatus("active");
      }
    }
  }, [visible, isEdit, employee, projects]);

  // Check if form has changed (for edit mode)
  const hasChanges = isEdit && employee
    ? name !== employee.name ||
      role !== (employee.role || "") ||
      projectId !== employee.projectId ||
      salary !== (employee.monthlySalary?.toString() || "") ||
      status !== (employee.employeeStatus || "active")
    : true;

  const handleSave = async () => {
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

    setIsSaving(true);
    try {
      if (isEdit && employee) {
        const result = await FinanceService.updateContact({
          contactId: employee.id,
          name: name.trim(),
          role: role.trim(),
          projectId,
          monthlySalary: salaryNum,
          employeeStatus: status,
        });

        if (result.success) {
          onSaved(true);
        } else {
          showError(result.error.message);
        }
      } else {
        const result = await FinanceService.createContact({
          name: name.trim(),
          types: ["employee"],
          role: role.trim(),
          projectId,
          monthlySalary: salaryNum,
        });

        if (result.success) {
          onSaved(false);
        } else {
          showError(result.error.message);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = name.trim().length >= 2 && role.trim() && projectId && parseFloat(salary) > 0;
  const isValid = isFormValid && (isEdit ? hasChanges : true);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-base text-gray-600">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Employee" : "Add Employee"}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={isSaving || !isValid}
            className="px-2 py-1"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  isValid ? "text-primary" : "text-gray-300"
                }`}
              >
                {isEdit ? "Save" : "Add"}
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
              Monthly Salary
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

          {/* Status (only show in edit mode) */}
          {isEdit && (
            <View className="mb-5">
              <Text className="text-sm font-medium text-gray-500 mb-2">Status</Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setStatus("active")}
                  style={[
                    styles.statusChip,
                    status === "active" && styles.statusChipActive,
                  ]}
                  className="flex-row items-center px-4 py-2.5 rounded-xl"
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: status === "active" ? COLORS.success : COLORS.gray400,
                      marginRight: 8,
                    }}
                  />
                  <Text
                    className={`text-sm font-medium ${
                      status === "active" ? "text-success" : "text-gray-600"
                    }`}
                  >
                    Active
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setStatus("inactive")}
                  style={[
                    styles.statusChip,
                    status === "inactive" && styles.statusChipInactive,
                  ]}
                  className="flex-row items-center px-4 py-2.5 rounded-xl"
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: status === "inactive" ? COLORS.gray500 : COLORS.gray400,
                      marginRight: 8,
                    }}
                  />
                  <Text
                    className={`text-sm font-medium ${
                      status === "inactive" ? "text-gray-700" : "text-gray-600"
                    }`}
                  >
                    Inactive
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
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
  statusChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  statusChipActive: {
    backgroundColor: `${COLORS.success}10`,
    borderColor: COLORS.success,
  },
  statusChipInactive: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray400,
  },
});
