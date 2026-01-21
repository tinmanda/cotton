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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lucide } from "@react-native-vector-icons/lucide";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { COLORS, ROUTES } from "@/constants";
import { FinanceService } from "@/services";
import {
  ParseTransactionResponse,
  IProject,
  ICategory,
  Currency,
  ImageInput,
} from "@/types";
import { useToast } from "@/hooks/useToast";

interface SelectedFile {
  uri: string;
  base64: string;
  mediaType: string;
  name?: string;
  isPdf?: boolean;
}

function formatAmount(amount: number, currency: Currency): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function AddTransactionScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
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

  const hasInput = text.trim().length > 0 || selectedFiles.length > 0;

  const handleParse = async () => {
    if (!hasInput) {
      showError("Please enter text or add files");
      return;
    }

    setIsParsing(true);
    try {
      // Use the unified parsing API
      const images: ImageInput[] = selectedFiles.map((file) => ({
        base64: file.base64,
        mediaType: file.mediaType,
      }));

      const result = await FinanceService.parseTransactionInput({
        text: text.trim() || undefined,
        images: images.length > 0 ? images : undefined,
        source: images.length > 0 ? "image" : "manual",
      });

      if (result.success && result.data.transactions.length > 0) {
        if (result.data.transactions.length === 1) {
          // Single transaction - show inline confirmation
          const tx = result.data.transactions[0];
          setParsedResult({
            parsed: {
              amount: tx.amount,
              currency: tx.currency,
              type: tx.type,
              date: tx.date,
              contactName: tx.contactName,
              description: tx.description,
              confidence: result.data.confidence,
              needsReview: false,
              rawExtracted: {},
            },
            rawInputId: result.data.rawInputId,
            suggestedCategory: result.data.categories.find(
              (c) => c.id === tx.suggestedCategoryId
            ) as any,
            suggestedProject: result.data.projects.find(
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
              data: JSON.stringify(result.data),
              rawInputId: result.data.rawInputId,
              summary: result.data.summary,
              confidence: result.data.confidence.toString(),
            },
          } as any);
          handleReset();
        }
      } else if (!result.success) {
        showError(result.error.message);
      } else {
        showError("No transactions found in the input");
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showError("Permission to access photos is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        selectionLimit: 5 - selectedFiles.length, // Max 5 files total
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const newFiles: SelectedFile[] = result.assets
        .filter((asset) => asset.base64)
        .map((asset) => ({
          uri: asset.uri,
          base64: asset.base64!,
          mediaType: asset.mimeType || "image/jpeg",
          isPdf: false,
        }));

      setSelectedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    } catch (error) {
      showError("Failed to pick images");
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

      if (result.canceled || !result.assets[0].base64) return;

      const asset = result.assets[0];
      const newFile: SelectedFile = {
        uri: asset.uri,
        base64: asset.base64,
        mediaType: asset.mimeType || "image/jpeg",
        isPdf: false,
      };

      setSelectedFiles((prev) => [...prev, newFile].slice(0, 5));
    } catch (error) {
      showError("Failed to capture image");
    }
  };

  const handlePdfPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) return;

      const newFiles: SelectedFile[] = [];
      for (const asset of result.assets.slice(0, 5 - selectedFiles.length)) {
        try {
          // First check if file is accessible
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          if (!fileInfo.exists) {
            console.error("PDF file not accessible at URI:", asset.uri);
            showError("Could not access PDF file");
            continue;
          }

          // Check file size (warn if over 10MB as base64 will be ~33% larger)
          if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
            showError("PDF file is too large (max 10MB)");
            continue;
          }

          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (!base64 || base64.length === 0) {
            showError("PDF file appears to be empty");
            continue;
          }

          newFiles.push({
            uri: asset.uri,
            base64,
            mediaType: "application/pdf",
            name: asset.name,
            isPdf: true,
          });
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "Unknown error";
          console.error("Failed to read PDF:", errorMessage, e);
          showError(`Failed to read PDF: ${errorMessage}`);
        }
      }

      if (newFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to pick PDF:", errorMessage, error);
      showError(`Failed to pick PDF: ${errorMessage}`);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;

    // Project is required
    if (!selectedProjectId) {
      showError("Please select a project");
      return;
    }

    setIsCreating(true);
    try {
      const result = await FinanceService.createTransactionFromParsed({
        rawInputId: parsedResult.rawInputId,
        amount: parsedResult.parsed.amount,
        currency: parsedResult.parsed.currency,
        type: parsedResult.parsed.type,
        date: parsedResult.parsed.date,
        contactName: parsedResult.parsed.contactName || "Unknown",
        categoryId: selectedCategoryId,
        projectId: selectedProjectId,
        description: parsedResult.parsed.description,
      });

      if (result.success) {
        showSuccess("Transaction added");
        handleReset();
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
    setSelectedFiles([]);
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
          Enter text, add images, or both
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {!parsedResult ? (
          // Input Mode
          <View className="px-4 pt-4">
            {isParsing ? (
              // Parsing state
              <View style={styles.inputCard} className="bg-white rounded-2xl p-8 items-center">
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text className="text-gray-600 mt-4">Analyzing input...</Text>
                <Text className="text-xs text-gray-400 mt-1">
                  Extracting transactions with AI
                </Text>
              </View>
            ) : (
              <>
                {/* Text Input */}
                <View style={styles.inputCard} className="bg-white rounded-2xl p-4">
                  <View className="flex-row items-center mb-2">
                    <Lucide name="text" size={16} color={COLORS.gray500} />
                    <Text className="text-sm font-medium text-gray-500 ml-2">
                      Text Input (optional)
                    </Text>
                  </View>
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Paste transaction text, SMS, or add context for images...

Examples:
• HDFC Bank: Rs.4,999 debited to Amazon
• Ajay salary: 30K for Jan-Jun, 60K for Jul-Oct
• These are office supply receipts for Project X"
                    placeholderTextColor={COLORS.gray400}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={styles.textInput}
                  />
                </View>

                {/* Files Section (Images & PDFs) */}
                <View style={styles.inputCard} className="bg-white rounded-2xl p-4 mt-3">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <Lucide name="paperclip" size={16} color={COLORS.gray500} />
                      <Text className="text-sm font-medium text-gray-500 ml-2">
                        Files (optional)
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400">
                      {selectedFiles.length}/5
                    </Text>
                  </View>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mb-3"
                    >
                      <View className="flex-row gap-2">
                        {selectedFiles.map((file, index) => (
                          <View key={index} className="relative">
                            {file.isPdf ? (
                              <View style={styles.pdfThumb} className="rounded-lg items-center justify-center">
                                <Lucide name="file-text" size={24} color={COLORS.error} />
                                <Text className="text-xs text-gray-600 mt-1 text-center px-1" numberOfLines={1}>
                                  {file.name?.substring(0, 10) || "PDF"}
                                </Text>
                              </View>
                            ) : (
                              <Image
                                source={{ uri: file.uri }}
                                style={styles.imageThumb}
                                className="rounded-lg"
                              />
                            )}
                            <Pressable
                              onPress={() => removeFile(index)}
                              style={styles.removeButton}
                              className="absolute -top-2 -right-2"
                            >
                              <Lucide name="x" size={12} color={COLORS.white} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  {/* Add File Buttons */}
                  {selectedFiles.length < 5 && (
                    <View className="gap-2">
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={handleCamera}
                          style={styles.imageButton}
                          className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                        >
                          <Lucide name="camera" size={18} color={COLORS.primary} />
                          <Text className="text-sm font-medium text-primary ml-2">
                            Camera
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleImagePick}
                          style={styles.imageButton}
                          className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                        >
                          <Lucide name="image-plus" size={18} color={COLORS.primary} />
                          <Text className="text-sm font-medium text-primary ml-2">
                            Gallery
                          </Text>
                        </Pressable>
                      </View>
                      <Pressable
                        onPress={handlePdfPick}
                        style={styles.imageButton}
                        className="flex-row items-center justify-center py-3 rounded-xl"
                      >
                        <Lucide name="file-text" size={18} color={COLORS.primary} />
                        <Text className="text-sm font-medium text-primary ml-2">
                          PDF Document
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Parse Button */}
                <Pressable
                  onPress={handleParse}
                  disabled={!hasInput}
                  style={[
                    styles.parseButton,
                    !hasInput && styles.parseButtonDisabled,
                  ]}
                  className="mt-4 flex-row items-center justify-center py-4 rounded-xl"
                >
                  <Lucide name="sparkles" size={20} color={COLORS.white} />
                  <Text className="text-white font-semibold ml-2">
                    Parse with AI
                  </Text>
                </Pressable>

                {/* Help text */}
                <View className="mt-4 px-2">
                  <View className="flex-row items-start">
                    <Lucide name="info" size={14} color={COLORS.primary} />
                    <Text className="text-xs text-gray-500 ml-2 flex-1">
                      <Text className="font-medium text-gray-600">Tip:</Text> Add both text and images for better accuracy. For example, upload receipt images and add "office supplies for Project ABC" as context.
                    </Text>
                  </View>
                </View>

                {/* Supported documents */}
                <View className="mt-4 px-2">
                  <Text className="text-sm font-medium text-gray-500 mb-2">
                    Supported inputs
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {["Receipts", "Invoices", "Bank SMS", "Screenshots", "PDFs", "Manual notes"].map(
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
                  {parsedResult.parsed.contactName}
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

                {/* Project Selector (Required) */}
                <Pressable
                  onPress={() => setShowProjectPicker(true)}
                  className="flex-row items-center justify-between py-3 border-t border-gray-100"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-500">Project</Text>
                    <Text className="text-xs text-error ml-1">*</Text>
                  </View>
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
                      <Text className="text-sm text-error">Select project</Text>
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

            {/* Original Input */}
            {(text || selectedFiles.length > 0) && (
              <View className="mt-6">
                <Text className="text-xs text-gray-400 mb-2">Original input:</Text>
                {text && (
                  <Text className="text-xs text-gray-500" numberOfLines={2}>
                    {text}
                  </Text>
                )}
                {selectedFiles.length > 0 && (
                  <Text className="text-xs text-gray-500">
                    + {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Project Picker Modal (Required - no clear option) */}
      <PickerModal
        visible={showProjectPicker}
        title="Select Project"
        items={projects.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
        selectedId={selectedProjectId}
        onSelect={(id) => {
          if (id) {
            setSelectedProjectId(id);
            setShowProjectPicker(false);
          }
        }}
        onClose={() => setShowProjectPicker(false)}
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
  inputCard: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textInput: {
    fontSize: 15,
    color: COLORS.gray900,
    minHeight: 140,
    lineHeight: 22,
  },
  imageButton: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  imageThumb: {
    width: 72,
    height: 72,
  },
  pdfThumb: {
    width: 72,
    height: 72,
    backgroundColor: `${COLORS.error}10`,
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  parseButton: {
    backgroundColor: COLORS.primary,
  },
  parseButtonDisabled: {
    backgroundColor: COLORS.gray300,
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
