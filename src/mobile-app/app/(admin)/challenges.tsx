import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../utils/firebaseConfig';
import { ms, s, vs } from '../../utils/responsive';

// Clamp font size between min and max regardless of device size
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
const fs = (size: number) => clamp(ms(size), 11, 13);

// --- Memoized Components ---

const QuizItem = memo(({ item, onEdit, onDelete, onManage, displayTitle }: any) => (
  <View style={styles.quizCardWrapper}>
    <TouchableOpacity
      style={styles.quizCard}
      onPress={() => onManage(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.quizInfo}>
        <Text style={styles.quizTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{displayTitle}</Text>
        <View style={styles.quizMeta}>
          <View style={styles.questionBadge}>
            <Text style={styles.metaText}>{item.questions?.length || 0} câu hỏi</Text>
          </View>
        </View>
      </View>
      <View style={styles.quizActions}>
        <TouchableOpacity
          style={[styles.actionIcon, { backgroundColor: '#eff6ff' }]}
          onPress={() => onEdit(item)}
        >
          <Ionicons name="pencil" size={ms(18)} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={ms(18)} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </View>
));
QuizItem.displayName = 'QuizItem';

const QuestionCard = memo(({ item, index, onEdit, onDelete }: any) => (
  <View style={styles.questionCard}>
    <View style={styles.questionHeader}>
      <View style={styles.questionIndexBadge}>
        <Text style={styles.questionIndexText}>Câu {index + 1}</Text>
      </View>
      <View style={styles.questionActions}>
        <TouchableOpacity onPress={() => onEdit(item)} style={styles.miniActionBtn}>
          <Ionicons name="pencil" size={ms(16)} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item)} style={[styles.miniActionBtn, { borderColor: '#fee2e2' }]}>
          <Ionicons name="trash-outline" size={ms(16)} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
    <Text style={styles.questionText}>{item.question}</Text>
    <View style={styles.optionsList}>
      {item.options.map((opt: string, i: number) => (
        <View key={i} style={[styles.optionItem, i === item.correctIndex && styles.correctOption]}>
          <View style={[styles.optionLetter, i === item.correctIndex && styles.correctLetter]}>
            <Text style={[styles.optionLetterText, i === item.correctIndex && styles.correctLetterText]}>
              {String.fromCharCode(65 + i)}
            </Text>
          </View>
          <Text style={[styles.optionText, i === item.correctIndex && styles.correctOptionText]}>
            {opt}
          </Text>
          {i === item.correctIndex && (
            <Ionicons name="checkmark-circle" size={ms(18)} color="#22c55e" style={{ marginLeft: 'auto' }} />
          )}
        </View>
      ))}
    </View>
  </View>
));
QuestionCard.displayName = 'QuestionCard';

const ChallengeManagement = () => {
  const insets = useSafeAreaInsets();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pagoda' | 'culture' | 'food'>('pagoda');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [managingQuizId, setManagingQuizId] = useState<string | null>(null);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);

  // Quiz Form State
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [qTitle, setQTitle] = useState('');
  const [qTitleKm, setQTitleKm] = useState('');
  const [qColor, setQColor] = useState('#3b82f6');
  const [qPagodaId, setQPagodaId] = useState('');

  // Question Form State
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questText, setQuestText] = useState('');
  const [questTextKm, setQuestTextKm] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [optionsKm, setOptionsKm] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState('');

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const toastY = useSharedValue(-120);

  const triggerToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToast(false), 400);
    }, 3000);
  }, []);

  const toastTop = insets.top + vs(8);

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    iconColor: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', icon: 'trash-outline', iconColor: '#ef4444', onConfirm: () => { } });

  const showConfirm = useCallback((title: string, message: string, icon: string, iconColor: string, onConfirm: () => void) => {
    setConfirmDialog({ visible: true, title, message, icon, iconColor, onConfirm });
  }, []);
  const hideConfirm = () => setConfirmDialog(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    setLoading(true);
    const qQuiz = query(collection(db, 'quizzes'));
    const unsubQuiz = onSnapshot(qQuiz, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = data.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
        const dateB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
        return dateB - dateA;
      });
      setQuizzes(sorted);
    });

    const qDest = query(collection(db, 'destinations'));
    const unsubDest = onSnapshot(qDest, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDestinations(data);
      setLoading(false);
    });

    return () => {
      unsubQuiz();
      unsubDest();
    };
  }, []);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      const id = q.id || '';
      const isCulture = id.startsWith('culture_');
      const isFood = id.startsWith('food_');
      const isPagoda = !isCulture && !isFood;

      const matchesTab = (activeTab === 'pagoda' && isPagoda) ||
        (activeTab === 'culture' && isCulture) ||
        (activeTab === 'food' && isFood);

      const matchesSearch = (q.pagodaName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.pagodaNameKm || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [quizzes, activeTab, searchQuery]);

  const resetQuizForm = () => {
    setEditingQuiz(null);
    setQTitle('');
    setQTitleKm('');
    setQColor('#3b82f6');
    setQPagodaId('');
  };

  const handleSaveQuiz = async () => {
    if (!qTitle || !qPagodaId) {
      triggerToast('Vui lòng điền đủ thông tin', 'error');
      return;
    }

    const quizData = {
      pagodaName: qTitle,
      pagodaNameKm: qTitleKm || qTitle,
      pagodaId: qPagodaId,
      color: qColor,
      updatedAt: new Date(),
    };

    try {
      if (editingQuiz) {
        await updateDoc(doc(db, 'quizzes', editingQuiz.id), quizData);
        triggerToast('Cập nhật thử thách thành công', 'success');
      } else {
        const newId = qPagodaId;
        await setDoc(doc(db, 'quizzes', newId), {
          ...quizData,
          id: newId,
          questions: [],
          createdAt: new Date(),
        });
        triggerToast('Thêm thử thách mới thành công', 'success');
      }
      setQuizModalVisible(false);
      resetQuizForm();
    } catch (error) {
      triggerToast('Lỗi khi lưu dữ liệu', 'error');
    }
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestText('');
    setQuestTextKm('');
    setOptions(['', '', '', '']);
    setOptionsKm(['', '', '', '']);
    setCorrectIndex(0);
    setExplanation('');
  };

  const handleSaveQuestion = async () => {
    if (!managingQuizId || !questText || options.some(o => !o)) {
      triggerToast('Vui lòng điền đủ câu hỏi và 4 đáp án', 'error');
      return;
    }

    const questionData = {
      id: editingQuestion?.id || Date.now().toString(),
      question: questText,
      questionKm: questTextKm || questText,
      options: options,
      optionsKm: optionsKm,
      correctIndex: correctIndex,
      explanation: explanation
    };

    try {
      const quizRef = doc(db, 'quizzes', managingQuizId);
      if (editingQuestion) {
        const currentQuiz = quizzes.find(q => q.id === managingQuizId);
        const newQuestions = currentQuiz.questions.map((q: any) => q.id === editingQuestion.id ? questionData : q);
        await updateDoc(quizRef, { questions: newQuestions });
      } else {
        await updateDoc(quizRef, {
          questions: arrayUnion(questionData)
        });
      }
      triggerToast('Lưu câu hỏi thành công', 'success');
      setQuestionModalVisible(false);
      resetQuestionForm();
    } catch (error) {
      triggerToast('Lỗi khi lưu câu hỏi', 'error');
    }
  };

  const deleteQuiz = useCallback((id: string) => {
    showConfirm(
      'Xóa bộ thử thách',
      'Tất cả câu hỏi trong bộ này sẽ bị xóa vĩnh viễn và không thể khôi phục',
      'trash-outline', '#ef4444',
      async () => {
        hideConfirm();
        await deleteDoc(doc(db, 'quizzes', id));
        triggerToast('Đã xóa bộ thử thách', 'success');
      }
    );
  }, [showConfirm, triggerToast]);

  const deleteQuestion = useCallback((quizId: string, question: any) => {
    showConfirm(
      'Xóa câu hỏi',
      'Câu hỏi này sẽ bị xóa khỏi bộ thử thách',
      'trash-outline', '#ef4444',
      async () => {
        hideConfirm();
        await updateDoc(doc(db, 'quizzes', quizId), {
          questions: arrayRemove(question)
        });
        triggerToast('Đã xóa câu hỏi', 'success');
      }
    );
  }, [showConfirm, triggerToast]);

  const getQuizDisplayTitle = (item: any) => {
    if (item.pagodaName) return item.pagodaName;
    if (item.title) return item.title;
    const linkedDest = destinations.find(d => d.id === (item.pagodaId || item.id));
    if (linkedDest) return linkedDest.name;
    return item.id;
  };

  const managingQuiz = useMemo(() => quizzes.find(q => q.id === managingQuizId), [quizzes, managingQuizId]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, vs(10)) }]}>
      <StatusBar style="dark" />

      {/* Premium Toast System */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            animatedToastStyle,
            {
              backgroundColor: toastType === 'error' ? '#EF4444' : '#10B981',
              shadowColor: toastType === 'error' ? '#EF4444' : '#10B981',
              top: toastTop,
            }
          ]}
        >
          <View style={styles.toastIcon}>
            <Ionicons
              name={toastType === 'success' ? "checkmark" : "close"}
              size={ms(20)}
              color="#FFF"
            />
          </View>
          <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Thử thách</Text>
        <TouchableOpacity
          style={styles.addBtnHeader}
          onPress={() => {
            resetQuizForm();
            setQuizModalVisible(true);
          }}
        >
          <Ionicons name="add" size={ms(30)} color="#0062ffff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pagoda' && styles.activeTab]}
          onPress={() => setActiveTab('pagoda')}
        >
          <Text style={[styles.tabText, activeTab === 'pagoda' && styles.activeTabText]}>Chùa Khmer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'culture' && styles.activeTab]}
          onPress={() => setActiveTab('culture')}
        >
          <Text style={[styles.tabText, activeTab === 'culture' && styles.activeTabText]}>Văn hóa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'food' && styles.activeTab]}
          onPress={() => setActiveTab('food')}
        >
          <Text style={[styles.tabText, activeTab === 'food' && styles.activeTabText]}>Ẩm thực</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredQuizzes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <QuizItem
              item={item}
              displayTitle={getQuizDisplayTitle(item)}
              onManage={(id: string) => setManagingQuizId(id)}
              onEdit={(q: any) => {
                setEditingQuiz(q);
                setQTitle(getQuizDisplayTitle(q));
                const linkedDest = destinations.find(d => d.id === (q.pagodaId || q.id));
                setQTitleKm(q.pagodaNameKm || linkedDest?.name_khmer || '');
                setQColor(q.color);
                setQPagodaId(q.pagodaId);
                setQuizModalVisible(true);
              }}
              onDelete={deleteQuiz}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + vs(20) }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="help-circle-outline" size={ms(60)} color="#e2e8f0" />
              <Text style={styles.emptyText}>Chưa có bộ câu hỏi nào</Text>
            </View>
          }
        />
      )}

      {/* --- Quiz Management Modal (Questions List) --- */}
      <Modal visible={!!managingQuizId} animationType="slide" transparent statusBarTranslucent={true}>
        <View style={styles.modalFullBg}>
          <View style={[styles.modalContentFull, { paddingTop: insets.top }]}>
            <View style={styles.modalHeaderFixed}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setManagingQuizId(null)}>
                <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
              </TouchableOpacity>
              <Text style={[styles.modalTitleFull, { fontSize: ms(17) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {managingQuiz ? getQuizDisplayTitle(managingQuiz) : ''}
              </Text>
              <TouchableOpacity
                style={styles.addBtnHeader}
                onPress={() => {
                  resetQuestionForm();
                  setQuestionModalVisible(true);
                }}
              >
                <Ionicons name="add" size={ms(30)} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={managingQuiz?.questions || []}
              keyExtractor={(item, index) => item.id || index.toString()}
              contentContainerStyle={{ padding: s(20), paddingBottom: insets.bottom + vs(50) }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <QuestionCard
                  item={item}
                  index={index}
                  onEdit={(q: any) => {
                    setEditingQuestion(q);
                    setQuestText(q.question);
                    setQuestTextKm(q.questionKm);
                    setOptions(q.options);
                    setOptionsKm(q.optionsKm || ['', '', '', '']);
                    setCorrectIndex(q.correctIndex);
                    setExplanation(q.explanation || '');
                    setQuestionModalVisible(true);
                  }}
                  onDelete={(q: any) => deleteQuestion(managingQuizId!, q)}
                />
              )}
              ListEmptyComponent={
                <View style={[styles.emptyContainer, { marginTop: vs(260) }]}>
                  <Ionicons name="chatbubbles-outline" size={ms(60)} color="#e2e8f0" />
                  <Text style={styles.emptyText} numberOfLines={1} adjustsFontSizeToFit>Bộ thử thách chưa có câu hỏi nào</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* --- Add/Edit Quiz Modal --- */}
      <Modal visible={quizModalVisible} animationType="fade" transparent statusBarTranslucent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBg}
        >
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>{editingQuiz ? 'Sửa Thử thách' : 'Thêm Thử thách'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: vs(400) }} keyboardShouldPersistTaps="handled" bounces={false}>
              <Text style={styles.inputLabel}>Tên thử thách (tiếng Việt)</Text>
              <TextInput
                style={styles.input}
                value={qTitle}
                onChangeText={setQTitle}
                placeholder="Nhập tên thử thách..."
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Tên thử thách (tiếng Khmer)</Text>
              <TextInput
                style={styles.input}
                value={qTitleKm}
                onChangeText={setQTitleKm}
                placeholder="Nhập tên tiếng Khmer..."
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Liên kết với nội dung</Text>
              <View style={styles.destListContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {destinations
                    .filter(d => {
                      if (editingQuiz && (editingQuiz.pagodaId === d.id || editingQuiz.id === d.id)) return true;
                      return !quizzes.some(q => q.pagodaId === d.id || q.id === d.id);
                    })
                    .map(d => (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.destChip, qPagodaId === d.id && styles.activeDestChip]}
                        onPress={() => {
                          setQPagodaId(d.id);
                          if (!qTitle) setQTitle(d.name);
                        }}
                      >
                        <Text style={[styles.destChipText, qPagodaId === d.id && styles.activeDestChipText]}>{d.name}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>

              {!destinations.some(d => d.id === qPagodaId) && (
                <TextInput
                  style={[styles.input, { marginTop: vs(10) }]}
                  value={qPagodaId}
                  onChangeText={setQPagodaId}
                  placeholder="Nhập ID nội dung thủ công..."
                  placeholderTextColor="#94a3b8"
                />
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnAction, styles.cancelBtn]} onPress={() => setQuizModalVisible(false)}>
                <Text style={styles.btnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAction, styles.saveBtn]} onPress={handleSaveQuiz}>
                <Text style={styles.btnText}>Lưu thử thách</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- Add/Edit Question Modal --- */}
      <Modal visible={questionModalVisible} animationType="slide" transparent statusBarTranslucent={true}>
        <View style={styles.modalFullBg}>
          <View style={[styles.modalContentFull, { paddingTop: insets.top }]}>
            <View style={styles.modalHeaderFixed}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setQuestionModalVisible(false)}>
                <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.modalTitleFull}>{editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</Text>
              <View style={{ width: s(44) }} />
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? vs(0) : 0}
            >
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={{ padding: s(20), paddingBottom: vs(120) }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <Text style={[styles.inputLabel, { marginTop: 0 }]}>Nội dung câu hỏi</Text>
                <TextInput
                  style={[styles.input, { height: vs(100), textAlignVertical: 'top' }]}
                  multiline
                  value={questText}
                  onChangeText={setQuestText}
                  placeholder="Nhập câu hỏi..."
                  placeholderTextColor="#94a3b8"
                />

                <Text style={[styles.inputLabel, { marginTop: vs(20) }]}>Các đáp án (Nhấn chọn đáp án đúng)</Text>
                {options.map((opt, i) => (
                  <View key={i} style={styles.optionInputRow}>
                    <TouchableOpacity
                      style={[styles.correctIndicator, correctIndex === i && styles.correctIndicatorActive]}
                      onPress={() => setCorrectIndex(i)}
                    >
                      <Text style={[styles.indicatorText, correctIndex === i && styles.indicatorTextActive]}>
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.input}
                        value={opt}
                        onChangeText={(val) => {
                          const newOpts = [...options];
                          newOpts[i] = val;
                          setOptions(newOpts);
                        }}
                        placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                ))}

                <Text style={[styles.inputLabel, { marginTop: vs(10) }]}>Giải thích đáp án</Text>
                <TextInput
                  style={[styles.input, { height: vs(100), textAlignVertical: 'top' }]}
                  multiline
                  value={explanation}
                  onChangeText={setExplanation}
                  placeholder="Giải thích vì sao đáp án này đúng..."
                  placeholderTextColor="#94a3b8"
                />
              </ScrollView>
            </KeyboardAvoidingView>

            <View style={[styles.modalFooter, {
              flexDirection: 'row',
              gap: s(12),
              alignItems: 'center',
              paddingBottom: Math.max(insets.bottom, vs(20)),
              paddingHorizontal: s(20),
              paddingTop: vs(15)
            }]}>
              <TouchableOpacity
                style={[styles.btnAction, styles.cancelBtn, { flex: 1, backgroundColor: '#ff0000ff' }]}
                onPress={() => setQuestionModalVisible(false)}
              >
                <Text style={[styles.btnText, { color: '#ffffffff' }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtnLarge, { flex: 2 }]} onPress={handleSaveQuestion}>
                <Text style={styles.saveBtnText}>Lưu câu hỏi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Custom Confirm Dialog --- */}
      <Modal visible={confirmDialog.visible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={[styles.confirmIconCircle, { backgroundColor: confirmDialog.iconColor + '18' }]}>
              <Ionicons name={confirmDialog.icon as any} size={ms(32)} color={confirmDialog.iconColor} />
            </View>
            <Text style={styles.confirmTitleText}>{confirmDialog.title}</Text>
            <Text style={styles.confirmMessage}>{confirmDialog.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#2353ffff' }]} onPress={hideConfirm}>
                <Text style={[styles.confirmBtnText, { color: '#ffffffff' }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#ff0000ff' }]}
                onPress={confirmDialog.onConfirm}
              >
                <Text style={styles.confirmBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingBottom: vs(12),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  modalHeaderFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingBottom: vs(6),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { width: s(44), height: s(44), justifyContent: 'center', alignItems: 'center' },
  addBtnHeader: { width: s(42), height: s(42), backgroundColor: '#eff6ff', borderRadius: s(12), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: ms(20), fontWeight: '400', color: '#1e293b', textAlign: 'center' },

  searchSection: { paddingHorizontal: s(16), marginTop: vs(15) },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: ms(16),
    paddingHorizontal: s(14),
    height: vs(50),
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  searchInput: { flex: 1, marginLeft: s(10), fontSize: ms(15), color: '#1e293b', fontWeight: '400' },

  tabBar: { flexDirection: 'row', marginHorizontal: s(16), marginTop: vs(15), backgroundColor: '#f1f5f9', borderRadius: s(14), padding: s(4) },
  tab: { flex: 1, paddingVertical: vs(10), alignItems: 'center', borderRadius: s(12) },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.1, shadowRadius: 5 },
  tabText: { fontSize: ms(13), fontWeight: '400', color: '#64748b' },
  activeTabText: { color: '#3b82f6' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: s(16) },

  quizCardWrapper: {
    marginBottom: vs(12),
    borderRadius: ms(20),
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: s(16),
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  quizInfo: { flex: 1 },
  quizTitle: { fontSize: fs(15), fontWeight: '400', color: '#1e293b', marginBottom: vs(6) },
  quizMeta: { flexDirection: 'row', alignItems: 'center' },
  questionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: s(10),
    gap: s(4)
  },
  metaText: { fontSize: clamp(ms(12), 12, 14), color: '#3b82f6', fontWeight: '400' },
  quizActions: { flexDirection: 'row', gap: s(8) },
  actionIcon: {
    width: s(40),
    height: s(40),
    borderRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },

  emptyContainer: { alignItems: 'center', marginTop: vs(150), opacity: 0.5 },
  emptyText: { fontSize: ms(16), color: '#94a3b8', marginTop: vs(16), fontWeight: '400', textAlign: 'center', paddingHorizontal: s(40) },

  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalFullBg: { flex: 1, backgroundColor: '#fff' },
  modalContentFull: { flex: 1, backgroundColor: '#fff', paddingHorizontal: s(20) },
  modalContentSmall: { width: '88%', backgroundColor: '#fff', borderRadius: ms(28), padding: s(24) },
  modalTitle: { fontSize: ms(22), fontWeight: '400', color: '#1e293b', marginBottom: vs(20), textAlign: 'center' },
  modalTitleFull: { flex: 1, fontSize: ms(17), fontWeight: '400', color: '#1e293b', textAlign: 'center' },

  inputLabel: { fontSize: clamp(ms(13), 12, 14), fontWeight: '400', color: '#64748b', marginBottom: vs(13), marginTop: vs(15) },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: ms(14),
    paddingHorizontal: s(16),
    height: vs(52),
    fontSize: ms(15),
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  modalActions: { flexDirection: 'row', gap: s(12), marginTop: vs(30) },
  btnAction: { flex: 1, height: vs(50), borderRadius: s(14), justifyContent: 'center', alignItems: 'center', elevation: 2 },
  cancelBtn: { backgroundColor: '#3b82f6' },
  saveBtn: { backgroundColor: '#ff0000ff' },
  btnText: { fontSize: ms(15), fontWeight: '400', color: '#ffffffff' },

  destListContainer: { marginBottom: vs(5) },
  destChip: { paddingHorizontal: s(12), paddingVertical: vs(8), borderRadius: s(10), backgroundColor: '#f1f5f9', marginRight: s(8), borderWidth: 1, borderColor: '#e2e8f0' },
  activeDestChip: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  destChipText: { fontSize: ms(13), color: '#64748b', fontWeight: '400' },
  activeDestChipText: { color: '#fff' },

  questionCard: { backgroundColor: '#fff', borderRadius: ms(20), padding: s(16), marginBottom: vs(15), borderWidth: 1, borderColor: '#f1f5f9', elevation: 2 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(12) },
  questionIndexBadge: { backgroundColor: '#eff6ff', paddingHorizontal: s(10), paddingVertical: vs(4), borderRadius: s(10) },
  questionIndexText: { fontSize: ms(12), fontWeight: '400', color: '#3b82f6' },
  questionActions: { flexDirection: 'row', gap: s(10) },
  miniActionBtn: { width: s(36), height: s(36), borderRadius: s(10), justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eff6ff' },
  questionText: { fontSize: ms(16), fontWeight: '400', color: '#1e293b', marginBottom: vs(15) },
  optionsList: { gap: vs(10) },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: s(12), borderRadius: s(12), backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  correctOption: { backgroundColor: '#f0fdf4', borderColor: '#bcf0da' },
  optionLetter: { width: s(28), height: s(28), borderRadius: s(14), backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: s(12) },
  correctLetter: { backgroundColor: '#22c55e' },
  optionLetterText: { fontSize: ms(13), fontWeight: '400', color: '#64748b' },
  correctLetterText: { color: '#fff' },
  optionText: { fontSize: ms(14), color: '#475569', fontWeight: '400', flex: 1 },
  correctOptionText: { color: '#166534', fontWeight: '400' },

  formScroll: { flex: 1 },
  optionInputRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), marginBottom: vs(12) },
  correctIndicator: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  correctIndicatorActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  indicatorText: { fontSize: ms(14), fontWeight: '400', color: '#64748b' },
  indicatorTextActive: { color: '#fff' },

  modalFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: s(20), borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  saveBtnLarge: { backgroundColor: '#3b82f6', height: vs(54), borderRadius: s(16), justifyContent: 'center', alignItems: 'center', elevation: 4 },
  saveBtnText: { fontSize: ms(16), fontWeight: '400', color: '#fff' },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { width: '85%', backgroundColor: '#fff', borderRadius: ms(28), padding: s(24), alignItems: 'center' },
  confirmIconCircle: { width: s(70), height: s(70), borderRadius: s(35), justifyContent: 'center', alignItems: 'center', marginBottom: vs(20) },
  confirmTitleText: { fontSize: ms(20), fontWeight: '400', color: '#1e293b', marginBottom: vs(10) },
  confirmMessage: { fontSize: ms(14), color: '#64748b', textAlign: 'center', lineHeight: ms(22), marginBottom: vs(25) },
  confirmActions: { flexDirection: 'row', gap: s(12) },
  confirmBtn: { flex: 1, height: vs(50), borderRadius: s(14), justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { fontSize: ms(15), fontWeight: '400', color: '#fff' },

  toastContainer: {
    position: 'absolute',
    left: s(16),
    right: s(16),
    height: vs(46),
    borderRadius: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(14),
    zIndex: 9999,
    elevation: 10,
  },
  toastIcon: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: ms(13),
    fontWeight: '400',
    marginLeft: s(10),
    flex: 1,
  },
});

export default ChallengeManagement;
