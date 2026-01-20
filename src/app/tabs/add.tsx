import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { COLORS, ROUTES } from "@/constants";
import { FinanceService } from "@/services";
import {
  ParseTransactionResponse,
  IProject,
  ICategory,
  Currency,
} from "@/types";
import { useToast } from "@/hooks/useToast";

type InputMode = "text" | "image";

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function AddTransactionScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParseTransactionResponse | null>(null);
  const [projects, setProjects] = useState<IProject[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);

  // Editable fields for confirmation
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Load projects and categories
  useEffect(() => {
    const loadData = async () => {
      const [projectsRes, categoriesRes] = await Promise.all([
        FinanceService.getProjects(),
        FinanceService.getCategories(),
      ]);
      if (projectsRes.success) setProjects(projectsRes.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);
    };
    loadData();
  }, []);

  // Check if text looks like bulk input (salary ranges, multiple months, etc.)
  const looksLikeBulkInput = (inputText: string): boolean => {
    const bulkPatterns = [
      /\d+\s*(months?|yrs?|years?)/i, // "6 months", "2 years"
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*[-–to]+\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // "Jan-Jun"
      /salary.*\d+.*for/i, // "salary was 30K for"
      /(\d+[kK]?\s*(per|\/)\s*month)/i, // "30K per month"
      /then\s+\d+/i, // "then 60000"
      /from\s+\w+\s+to\s+\w+/i, // "from Jan to Jun"
    ];
    return bulkPatterns.some((pattern) => pattern.test(inputText));
  };

  const handleParse = async () => {
    if (text.trim().length < 5) {
      showError("Please enter transaction text");
      return;
    }

    setIsParsing(true);
    try {
      // Check if this looks like a bulk input
      if (looksLikeBulkInput(text)) {
        const result = await FinanceService.parseBulkTransactions(text.trim());
        if (result.success && result.data.transactions.length > 0) {
          // Navigate to bulk confirmation screen
          router.push({
            pathname: ROUTES.BULK_TRANSACTIONS,
            params: {
              data: JSON.stringify(result.data),
              rawInputId: result.data.rawInputId,
              summary: result.data.summary,
              confidence: result.data.confidence.toString(),
            },
          } as any);
          setText("");
          return;
        } else if (!result.success) {
          showError(result.error.message);
          return;
        }
      }

      // Single transaction parsing
      const result = await FinanceService.parseTransaction(text.trim());
      if (result.success) {
        setParsedResult(result.data);
        setSelectedProjectId(result.data.suggestedProject?.id);
        setSelectedCategoryId(result.data.suggestedCategory?.id);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleImagePick = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showError("Permission to access photos is required");
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0].base64) {
        return;
      }

      setIsParsing(true);
      const asset = result.assets[0];
      const mediaType = asset.mimeType || "image/jpeg";

      const parseResult = await FinanceService.parseTransactionFromImage(
        asset.base64,
        mediaType,
        "image"
      );

      if (parseResult.success && parseResult.data.transactions.length > 0) {
        if (parseResult.data.transactions.length === 1) {
          // Single transaction - show inline confirmation
          const tx = parseResult.data.transactions[0];
          setParsedResult({
            parsed: {
              amount: tx.amount,
              currency: tx.currency,
              type: tx.type,
              date: tx.date,
              merchantName: tx.merchantName,
              description: tx.description,
              confidence: parseResult.data.confidence,
              needsReview: false,
              rawExtracted: {},
            },
            rawInputId: parseResult.data.rawInputId,
            suggestedCategory: parseResult.data.categories.find(
              (c) => c.id === tx.suggestedCategoryId
            ) as any,
            suggestedProject: parseResult.data.projects.find(
              (p) => p.id === tx.suggestedProjectId
            ) as any,
          });
          setSelectedCategoryId(tx.suggestedCategoryId || undefined);
          setSelectedProjectId(tx.suggestedProjectId || undefined);
        } else {
          // Multiple transactions - go to bulk screen
          router.push({
            pathname: ROUTES.BULK_TRANSACTIONS,
            params: {
              data: JSON.stringify(parseResult.data),
              rawInputId: parseResult.data.rawInputId,
              summary: parseResult.data.summary,
              confidence: parseResult.data.confidence.toString(),
            },
          } as any);
        }
      } else if (!parseResult.success) {
        showError(parseResult.error.message);
      } else {
        showError("No transactions found in the image");
      }
    } catch (error) {
      showError("Failed to process image");
    } finally {
      setIsParsing(false);
    }
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showError("Permission to access camera is required");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0].base64) {
        return;
      }

      setIsParsing(true);
      const asset = result.assets[0];
      const mediaType = asset.mimeType || "image/jpeg";

      const parseResult = await FinanceService.parseTransactionFromImage(
        asset.base64,
        mediaType,
        "camera"
      );

      if (parseResult.success && parseResult.data.transactions.length > 0) {
        if (parseResult.data.transactions.length === 1) {
          const tx = parseResult.data.transactions[0];
          setParsedResult({
            parsed: {
              amount: tx.amount,
              currency: tx.currency,
              type: tx.type,
              date: tx.date,
              merchantName: tx.merchantName,
              description: tx.description,
              confidence: parseResult.data.confidence,
              needsReview: false,
              rawExtracted: {},
            },
            rawInputId: parseResult.data.rawInputId,
            suggestedCategory: parseResult.data.categories.find(
              (c) => c.id === tx.suggestedCategoryId
            ) as any,
            suggestedProject: parseResult.data.projects.find(
              (p) => p.id === tx.suggestedProjectId
            ) as any,
          });
          setSelectedCategoryId(tx.suggestedCategoryId || undefined);
          setSelectedProjectId(tx.suggestedProjectId || undefined);
        } else {
          router.push({
            pathname: ROUTES.BULK_TRANSACTIONS,
            params: {
              data: JSON.stringify(parseResult.data),
              rawInputId: parseResult.data.rawInputId,
              summary: parseResult.data.summary,
              confidence: parseResult.data.confidence.toString(),
            },
          } as any);
        }
      } else if (!parseResult.success) {
        showError(parseResult.error.message);
      } else {
        showError("No transactions found in the image");
      }
    } catch (error) {
      showError("Failed to process image");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;

    setIsCreating(true);
    try {
      const result = await FinanceService.createTransactionFromParsed({
        rawInputId: parsedResult.rawInputId,
        amount: parsedResult.parsed.amount,
        currency: parsedResult.parsed.currency,
        type: parsedResult.parsed.type,
        date: parsedResult.parsed.date,
        merchantName: parsedResult.parsed.merchantName || "Unknown",
        categoryId: selectedCategoryId,
        projectId: selectedProjectId,
        description: parsedResult.parsed.description,
      });

      if (result.success) {
        showSuccess("Transaction added");
        setText("");
        setParsedResult(null);
        router.push(ROUTES.TRANSACTIONS);
      } else {
        showError(result.error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setText("");
    setParsedResult(null);
    setSelectedProjectId(undefined);
    setSelectedCategoryId(undefined);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Add Transaction</Text>
        <Text className="text-sm text-gray-500 mt-0.5">
          Paste text, upload receipt, or take photo
        </Text>
      </View>

      {/* Input Mode Tabs */}
      {!parsedResult && (
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setInputMode("text")}
              style={[styles.modeTab, inputMode === "text" && styles.modeTabActive]}
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
            >
              <Lucide
                name="text"
                size={18}
                color={inputMode === "text" ? COLORS.primary : COLORS.gray500}
              />
              <Text
                className={`ml-2 text-sm font-medium ${
                  inputMode === "text" ? "text-primary" : "text-gray-500"
                }`}
              >
                Text
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setInputMode("image")}
              style={[styles.modeTab, inputMode === "image" && styles.modeTabActive]}
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
            >
              <Lucide
                name="image"
                size={18}
                color={inputMode === "image" ? COLORS.primary : COLORS.gray500}
              />
              <Text
                className={`ml-2 text-sm font-medium ${
                  inputMode === "image" ? "text-primary" : "text-gray-500"
                }`}
              >
                Image
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {!parsedResult ? (
          inputMode === "text" ? (
            // Text Input Mode
            <View className="px-4 pt-4">
              <View style={styles.inputCard} className="bg-white rounded-2xl p-4">
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Paste transaction text here...

Examples:
• HDFC Bank: Rs.4,999 debited to Amazon
• Ajay salary: 30K for Jan-Jun, 60K for Jul-Oct 2025
• Invoice from Anthropic - $200 for API usage"
                  placeholderTextColor={COLORS.gray400}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  style={styles.textInput}
                />
              </View>

              <Pressable
                onPress={handleParse}
                disabled={isParsing || text.trim().length < 5}
                style={[
                  styles.parseButton,
                  (isParsing || text.trim().length < 5) && styles.parseButtonDisabled,
                ]}
                className="mt-4 flex-row items-center justify-center py-4 rounded-xl"
              >
                {isParsing ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text className="text-white font-semibold ml-2">Analyzing...</Text>
                  </>
                ) : (
                  <>
                    <Lucide name="sparkles" size={20} color={COLORS.white} />
                    <Text className="text-white font-semibold ml-2">
                      Parse with AI
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Bulk hint */}
              <View className="mt-4 px-2">
                <View className="flex-row items-start">
                  <Lucide name="info" size={14} color={COLORS.primary} className="mt-0.5" />
                  <Text className="text-xs text-gray-500 ml-2 flex-1">
                    <Text className="font-medium text-gray-600">Tip:</Text> You can add bulk entries like
                    "Ajay salary 30K for Jan-Jun, then 60K for Jul-Oct" and AI will create multiple transactions.
                  </Text>
                </View>
              </View>

              {/* Quick examples */}
              <View className="mt-6">
                <Text className="text-sm font-medium text-gray-500 mb-3">
                  Quick examples
                </Text>
                {[
                  "HDFC: Rs.1,500 debited to Amazon",
                  "Received Rs.50,000 from Client ABC",
                  "Ajay salary: 30K/month Jan-Jun 2025",
                ].map((example, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setText(example)}
                    style={styles.exampleChip}
                    className="mb-2 px-4 py-3 rounded-xl"
                  >
                    <Text className="text-sm text-gray-700">{example}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            // Image Input Mode
            <View className="px-4 pt-4">
              {isParsing ? (
                <View style={styles.inputCard} className="bg-white rounded-2xl p-8 items-center">
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text className="text-gray-600 mt-4">Analyzing image...</Text>
                  <Text className="text-xs text-gray-400 mt-1">
                    Extracting transactions with AI
                  </Text>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={handleCamera}
                    style={styles.inputCard}
                    className="bg-white rounded-2xl p-6 items-center mb-3"
                  >
                    <View style={styles.iconCircle}>
                      <Lucide name="camera" size={32} color={COLORS.primary} />
                    </View>
                    <Text className="text-base font-semibold text-gray-900 mt-4">
                      Take Photo
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1 text-center">
                      Capture a receipt, invoice, or bank statement
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleImagePick}
                    style={styles.inputCard}
                    className="bg-white rounded-2xl p-6 items-center"
                  >
                    <View style={styles.iconCircle}>
                      <Lucide name="image" size={32} color={COLORS.primary} />
                    </View>
                    <Text className="text-base font-semibold text-gray-900 mt-4">
                      Choose from Gallery
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1 text-center">
                      Select an existing photo
                    </Text>
                  </Pressable>

                  <View className="mt-6 px-2">
                    <Text className="text-sm font-medium text-gray-500 mb-2">
                      Supported documents
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {["Receipts", "Invoices", "Bank Statements", "Screenshots"].map(
                        (type) => (
                          <View key={type} style={styles.supportedChip} className="px-3 py-1.5 rounded-full">
                            <Text className="text-xs text-gray-600">{type}</Text>
                          </View>
                        )
                      )}
                    </View>
                  </View>
                </>
              )}
            </View>
          )
        ) : (
          // Confirmation Mode
          <View className="px-4 pt-4">
            {/* Parsed Result Card */}
            <View style={styles.resultCard} className="bg-white rounded-2xl p-5">
              {/* Amount and Type */}
              <View className="items-center mb-4">
                <View
                  style={[
                    styles.typeIndicator,
                    {
                      backgroundColor:
                        parsedResult.parsed.type === "expense"
                          ? `${COLORS.error}15`
                          : `${COLORS.success}15`,
                    },
                  ]}
                  className="px-3 py-1 rounded-full mb-2"
                >
                  <Text
                    className="text-xs font-semibold uppercase"
                    style={{
                      color:
                        parsedResult.parsed.type === "expense"
                          ? COLORS.error
                          : COLORS.success,
                    }}
                  >
                    {parsedResult.parsed.type}
                  </Text>
                </View>
                <Text
                  className="text-3xl font-bold"
                  style={{
                    color:
                      parsedResult.parsed.type === "expense"
                        ? COLORS.error
                        : COLORS.success,
                  }}
                >
                  {parsedResult.parsed.type === "expense" ? "-" : "+"}
                  {formatAmount(parsedResult.parsed.amount, parsedResult.parsed.currency)}
                </Text>
                <Text className="text-sm text-gray-500 mt-1">
                  {parsedResult.parsed.merchantName}
                </Text>
              </View>

              {/* Details */}
              <View className="border-t border-gray-100 pt-4">
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-sm text-gray-500">Date</Text>
                  <Text className="text-sm font-medium text-gray-800">
                    {new Date(parsedResult.parsed.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>

                {/* Project Selector */}
                <Pressable
                  onPress={() => setShowProjectPicker(true)}
                  className="flex-row items-center justify-between py-3 border-t border-gray-100"
                >
                  <Text className="text-sm text-gray-500">Project</Text>
                  <View className="flex-row items-center">
                    {selectedProject ? (
                      <>
                        <View
                          style={[styles.projectDot, { backgroundColor: selectedProject.color }]}
                        />
                        <Text className="text-sm font-medium text-gray-800 ml-2">
                          {selectedProject.name}
                        </Text>
                      </>
                    ) : (
                      <Text className="text-sm text-gray-400">Select project</Text>
                    )}
                    <Lucide name="chevron-right" size={16} color={COLORS.gray400} className="ml-1" />
                  </View>
                </Pressable>

                {/* Category Selector */}
                <Pressable
                  onPress={() => setShowCategoryPicker(true)}
                  className="flex-row items-center justify-between py-3 border-t border-gray-100"
                >
                  <Text className="text-sm text-gray-500">Category</Text>
                  <View className="flex-row items-center">
                    {selectedCategory ? (
                      <Text className="text-sm font-medium text-gray-800">
                        {selectedCategory.name}
                      </Text>
                    ) : (
                      <Text className="text-sm text-gray-400">Select category</Text>
                    )}
                    <Lucide name="chevron-right" size={16} color={COLORS.gray400} className="ml-1" />
                  </View>
                </Pressable>

                {parsedResult.parsed.description && (
                  <View className="py-2 border-t border-gray-100">
                    <Text className="text-sm text-gray-500">Description</Text>
                    <Text className="text-sm text-gray-800 mt-1">
                      {parsedResult.parsed.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confidence */}
              <View className="flex-row items-center justify-center mt-4 pt-4 border-t border-gray-100">
                <Lucide name="sparkles" size={14} color={COLORS.primary} />
                <Text className="text-xs text-gray-500 ml-1">
                  AI Confidence: {Math.round(parsedResult.parsed.confidence * 100)}%
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={handleReset}
                style={styles.secondaryButton}
                className="flex-1 py-4 rounded-xl items-center"
              >
                <Text className="text-gray-700 font-semibold">Start Over</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={isCreating}
                style={styles.primaryButton}
                className="flex-1 py-4 rounded-xl items-center"
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text className="text-white font-semibold">Confirm</Text>
                )}
              </Pressable>
            </View>

            {/* Original Text */}
            {text && (
              <View className="mt-6">
                <Text className="text-xs text-gray-400 mb-2">Original text:</Text>
                <Text className="text-xs text-gray-500" numberOfLines={3}>
                  {text}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Project Picker Modal */}
      <PickerModal
        visible={showProjectPicker}
        title="Select Project"
        items={projects.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
        selectedId={selectedProjectId}
        onSelect={(id) => {
          setSelectedProjectId(id);
          setShowProjectPicker(false);
        }}
        onClose={() => setShowProjectPicker(false)}
        allowClear
      />

      {/* Category Picker Modal */}
      <PickerModal
        visible={showCategoryPicker}
        title="Select Category"
        items={categories
          .filter((c) => c.type === parsedResult?.parsed.type)
          .map((c) => ({ id: c.id, name: c.name, color: c.color }))}
        selectedId={selectedCategoryId}
        onSelect={(id) => {
          setSelectedCategoryId(id);
          setShowCategoryPicker(false);
        }}
        onClose={() => setShowCategoryPicker(false)}
        allowClear
      />
    </SafeAreaView>
  );
}

function PickerModal({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  allowClear,
}: {
  visible: boolean;
  title: string;
  items: { id: string; name: string; color?: string }[];
  selectedId?: string;
  onSelect: (id?: string) => void;
  onClose: () => void;
  allowClear?: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          <Pressable onPress={onClose} className="p-2">
            <Lucide name="x" size={24} color={COLORS.gray600} />
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          {allowClear && (
            <Pressable
              onPress={() => onSelect(undefined)}
              className="flex-row items-center px-6 py-4 border-b border-gray-100"
            >
              <Text className="text-base text-gray-500">None</Text>
              {!selectedId && (
                <Lucide name="check" size={20} color={COLORS.primary} className="ml-auto" />
              )}
            </Pressable>
          )}
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onSelect(item.id)}
              className="flex-row items-center px-6 py-4 border-b border-gray-100"
            >
              {item.color && (
                <View
                  style={{ backgroundColor: item.color, width: 12, height: 12, borderRadius: 6 }}
                  className="mr-3"
                />
              )}
              <Text className="text-base text-gray-800 flex-1">{item.name}</Text>
              {selectedId === item.id && (
                <Lucide name="check" size={20} color={COLORS.primary} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modeTab: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  modeTabActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  inputCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    fontSize: 16,
    color: COLORS.gray900,
    minHeight: 200,
    lineHeight: 24,
  },
  parseButton: {
    backgroundColor: COLORS.primary,
  },
  parseButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  exampleChip: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  supportedChip: {
    backgroundColor: COLORS.gray100,
  },
  resultCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  typeIndicator: {},
  projectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  secondaryButton: {
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
});
