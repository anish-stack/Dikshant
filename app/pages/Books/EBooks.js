import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Feather, Ionicons } from "@expo/vector-icons";
import Pdf from 'react-native-pdf';
import Layout from '../../components/layout';

const { width, height } = Dimensions.get('window');

const colors = {
  primary: "#EF4444",
  primaryDark: "#4F46E5",
  secondary: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  dark: "#1F2937",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
  border: "#E5E7EB",
  success: "#10B981",
};

const BookPdf = [
  {
    id: 1,
    title: "UPSC IAS Prelims Complete Guide 2025",
    author: "Dr. Rajesh Kumar",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    category: "government",
    exam: "UPSC IAS",
    type: "Civil Services",
    rating: 4.9,
    reviews: 1250,
    downloads: "50K+",
    pages: 450,
    price: 0,
    discountPrice: 0,
    tag: "Free",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Comprehensive guide covering all aspects of UPSC IAS Prelims examination with latest pattern and syllabus.",
    language: "English",
    year: "2025"
  },
  {
    id: 2,
    title: "UPSC IAS Mains Strategy & Notes",
    author: "Priya Sharma",
    image: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400",
    category: "government",
    exam: "UPSC IAS",
    type: "Civil Services",
    rating: 4.8,
    reviews: 980,
    downloads: "45K+",
    pages: 520,
    price: 399,
    discountPrice: 249,
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Strategic approach to UPSC Mains with answer writing techniques and comprehensive notes.",
    language: "English & Hindi",
    year: "2025"
  },
  {
    id: 3,
    title: "SSC CGL Complete Preparation",
    author: "Amit Singh",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400",
    category: "government",
    exam: "SSC CGL",
    type: "Staff Selection",
    rating: 4.7,
    reviews: 750,
    downloads: "38K+",
    pages: 380,
    price: 0,
    discountPrice: 0,
    tag: "Free",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Complete SSC CGL preparation material with practice questions and mock tests.",
    language: "English",
    year: "2025"
  },
  {
    id: 4,
    title: "IBPS PO Banking Awareness",
    author: "Neha Gupta",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
    category: "government",
    exam: "IBPS PO",
    type: "Banking",
    rating: 4.6,
    reviews: 620,
    downloads: "30K+",
    pages: 280,
    price: 299,
    discountPrice: 199,
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Banking and financial awareness for IBPS PO with current affairs and industry trends.",
    language: "English",
    year: "2025"
  },
  {
    id: 5,
    title: "Railway RRB NTPC Guide 2025",
    author: "Vikram Mehta",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400",
    category: "government",
    exam: "Railway RRB",
    type: "Railway Exams",
    rating: 4.5,
    reviews: 890,
    downloads: "35K+",
    pages: 340,
    price: 0,
    discountPrice: 0,
    tag: "Free",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Complete Railway RRB NTPC preparation guide with previous year papers.",
    language: "English & Hindi",
    year: "2025"
  },
  {
    id: 6,
    title: "State PSC Combined Exam Guide",
    author: "Dr. Ananya Reddy",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400",
    category: "government",
    exam: "State PSC",
    type: "State Services",
    rating: 4.7,
    reviews: 540,
    downloads: "28K+",
    pages: 410,
    price: 349,
    discountPrice: 249,
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    description: "Comprehensive guide for State PSC exams covering all major state patterns.",
    language: "English",
    year: "2025"
  }
];

export default function EBooks() {
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [purchasedBooks, setPurchasedBooks] = useState([]);
  const [pdfPage, setPdfPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: ''
  });

  const freeBooks = BookPdf.filter(book => book.price === 0);
  const paidBooks = BookPdf.filter(book => book.price > 0);

  const getFilteredBooks = () => {
    let books = selectedTab === 'all' ? BookPdf :
      selectedTab === 'free' ? freeBooks : paidBooks;

    if (searchQuery) {
      books = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.exam.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return books;
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
  };

  const handleDownload = (book) => {
    Alert.alert(
      'Download Started',
      `"${book.title}" is being downloaded to your device.`,
      [{ text: 'OK' }]
    );
  };

  const handleBuyNow = (book) => {
    setSelectedBook(book);
    setShowPaymentModal(true);
  };

  const handleViewPdf = (book) => {
    const isPurchased = purchasedBooks.includes(book.id);
    const isFree = book.price === 0;

    if (isFree || isPurchased) {
      setSelectedBook(book);
      setShowPdfViewer(true);
    } else {
      Alert.alert(
        'Purchase Required',
        'You need to purchase this book to view it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Now', onPress: () => handleBuyNow(book) }
        ]
      );
    }
  };

  const processPayment = () => {
    // Validate payment details
    if (!paymentDetails.cardNumber || !paymentDetails.cardName ||
      !paymentDetails.expiryDate || !paymentDetails.cvv) {
      Alert.alert('Error', 'Please fill all payment details');
      return;
    }

    // Simulate payment processing
    setTimeout(() => {
      setPurchasedBooks([...purchasedBooks, selectedBook.id]);
      setShowPaymentModal(false);
      Alert.alert(
        'Payment Successful! 🎉',
        `You have successfully purchased "${selectedBook.title}"`,
        [
          {
            text: 'View Book',
            onPress: () => {
              setShowPdfViewer(true);
            }
          }
        ]
      );
      setPaymentDetails({
        cardNumber: '',
        cardName: '',
        expiryDate: '',
        cvv: ''
      });
    }, 1500);
  };

  const BookCard = ({ book }) => {
    const isFree = book.price === 0;
    const isPurchased = purchasedBooks.includes(book.id);

    return (
      <TouchableOpacity
        style={styles.bookCard}
        onPress={() => handleBookClick(book)}
        activeOpacity={0.7}
      >
        {book.tag && (
          <View style={[styles.tag, isFree ? styles.freeTag : styles.premiumTag]}>
            <Text style={styles.tagText}>{book.tag}</Text>
          </View>
        )}

        {isPurchased && (
          <View style={styles.purchasedBadge}>
            <Icon name="check-circle" size={16} color={colors.white} />
            <Text style={styles.purchasedText}>Owned</Text>
          </View>
        )}

        <Image source={{ uri: book.image }} style={styles.bookImage} />

        <View style={styles.bookContent}>
          <View style={styles.examBadge}>
            <Text style={styles.examText}>{book.exam}</Text>
          </View>

          <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>by {book.author}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text style={styles.statText}>{book.rating}</Text>
              <Text style={styles.statSubText}>({book.reviews})</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="download" size={14} color={colors.gray} />
              <Text style={styles.statText}>{book.downloads}</Text>
            </View>
          </View>

          {!isFree && !isPurchased && (
            <View style={styles.priceContainer}>
              <View style={styles.priceRow}>
                <Text style={styles.originalPrice}>₹{book.price}</Text>
                <Text style={styles.discountPrice}>₹{book.discountPrice}</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round((1 - book.discountPrice / book.price) * 100)}% OFF
                </Text>
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => handleViewPdf(book)}
            >
              <Feather name="eye" size={18} color={colors.primary} />
            </TouchableOpacity>

            {isFree || isPurchased ? (
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownload(book)}
              >
                {/* <Feather name="download" size={16} color={colors.white} /> */}
                <Text style={styles.btnText}>Download</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => handleBuyNow(book)}
              >
                {/* <Feather name="shopping-cart" size={16} color={colors.white} /> */}
                <Text style={styles.btnText}>Buy Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Layout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>📚 E-Books Library</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search books, exams, authors..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.gray}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={20} color={colors.gray} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          {[
            { key: 'all', label: 'All Books', count: BookPdf.length },
            { key: 'free', label: 'Free', count: freeBooks.length },
            { key: 'paid', label: 'Premium', count: paidBooks.length }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text style={[styles.tabLabel, selectedTab === tab.key && styles.activeTabLabel]}>
                {tab.label}
              </Text>
              <View style={[styles.countBadge, selectedTab === tab.key && styles.activeCountBadge]}>
                <Text style={[styles.countText, selectedTab === tab.key && styles.activeCountText]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Books Grid */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridContainer}>
            {getFilteredBooks().map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </View>

          {getFilteredBooks().length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No books found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          )}
        </ScrollView>

        {/* Book Detail Modal */}
        <Modal
          visible={!!selectedBook && !showPaymentModal && !showPdfViewer}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedBook(null)}
        >
          {selectedBook && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedBook(null)}
                  >
                    <Ionicons name="close" size={24} color={colors.dark} />
                  </TouchableOpacity>

                  {/* <Image source={{ uri: selectedBook.image }} style={styles.modalImage} /> */}

                  <View style={styles.modalBody}>
                    <View style={styles.modalExamBadge}>
                      <Text style={styles.modalExamText}>{selectedBook.exam}</Text>
                    </View>

                    <Text style={styles.modalTitle}>{selectedBook.title}</Text>
                    <Text style={styles.modalAuthor}>by {selectedBook.author}</Text>

                    <View style={styles.modalStats}>
                      <View style={styles.modalStat}>
                        <Ionicons name="star" size={16} color={colors.warning} />
                        <Text style={styles.modalStatText}>{selectedBook.rating} ({selectedBook.reviews} reviews)</Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Feather name="download" size={16} color={colors.gray} />
                        <Text style={styles.modalStatText}>{selectedBook.downloads}</Text>
                      </View>
                      <View style={styles.modalStat}>
                        <Feather name="book-open" size={16} color={colors.gray} />
                        <Text style={styles.modalStatText}>{selectedBook.pages} pages</Text>
                      </View>
                    </View>

                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{selectedBook.description}</Text>

                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Language</Text>
                        <Text style={styles.infoValue}>{selectedBook.language}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Year</Text>
                        <Text style={styles.infoValue}>{selectedBook.year}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Category</Text>
                        <Text style={styles.infoValue}>{selectedBook.type}</Text>
                      </View>
                    </View>

                    {selectedBook.price > 0 && !purchasedBooks.includes(selectedBook.id) && (
                      <View style={styles.modalPriceCard}>
                        <View>
                          <Text style={styles.modalOriginalPrice}>₹{selectedBook.price}</Text>
                          <Text style={styles.modalDiscountPrice}>₹{selectedBook.discountPrice}</Text>
                        </View>
                        <View style={styles.modalDiscountBadge}>
                          <Text style={styles.modalDiscountText}>
                            Save {Math.round((1 - selectedBook.discountPrice / selectedBook.price) * 100)}%
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalViewBtn}
                        onPress={() => handleViewPdf(selectedBook)}
                      >
                        <Feather name="eye" size={20} color={colors.white} />
                        <Text style={styles.modalBtnText}>View Book</Text>
                      </TouchableOpacity>

                      {(selectedBook.price === 0 || purchasedBooks.includes(selectedBook.id)) ? (
                        <TouchableOpacity
                          style={styles.modalDownloadBtn}
                          onPress={() => handleDownload(selectedBook)}
                        >
                          <Feather name="download" size={20} color={colors.white} />
                          <Text style={styles.modalBtnText}>Download</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.modalBuyBtn}
                          onPress={() => handleBuyNow(selectedBook)}
                        >
                          <Feather name="shopping-cart" size={20} color={colors.white} />
                          <Text style={styles.modalBtnText}>Buy Now</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>

        {/* Payment Modal */}
        <Modal
          visible={showPaymentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.paymentModal}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>💳 Payment Details</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Ionicons name="close" size={24} color={colors.dark} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedBook && (
                  <View style={styles.orderSummary}>
                    <Text style={styles.summaryTitle}>Order Summary</Text>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{selectedBook.title}</Text>
                      <Text style={styles.summaryValue}>₹{selectedBook.discountPrice}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryTotal}>Total Amount</Text>
                      <Text style={styles.summaryTotalValue}>₹{selectedBook.discountPrice}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Card Number</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="credit-card" size={20} color={colors.gray} />
                    <TextInput
                      style={styles.input}
                      placeholder="1234 5678 9012 3456"
                      value={paymentDetails.cardNumber}
                      onChangeText={(text) => setPaymentDetails({ ...paymentDetails, cardNumber: text })}
                      keyboardType="numeric"
                      maxLength={16}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cardholder Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    value={paymentDetails.cardName}
                    onChangeText={(text) => setPaymentDetails({ ...paymentDetails, cardName: text })}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.label}>Expiry Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MM/YY"
                      value={paymentDetails.expiryDate}
                      onChangeText={(text) => setPaymentDetails({ ...paymentDetails, expiryDate: text })}
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>CVV</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="123"
                        value={paymentDetails.cvv}
                        onChangeText={(text) => setPaymentDetails({ ...paymentDetails, cvv: text })}
                        keyboardType="numeric"
                        maxLength={3}
                        secureTextEntry
                      />
                      <Feather name="lock" size={16} color={colors.gray} />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={processPayment}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                  <Text style={styles.payBtnText}>
                    Pay ₹{selectedBook?.discountPrice}
                  </Text>
                </TouchableOpacity>

                <View style={styles.secureNote}>
                  <Feather name="lock" size={16} color={colors.success} />
                  <Text style={styles.secureText}>
                    Your payment information is secure and encrypted
                  </Text>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* PDF Viewer Modal */}
        <Modal
          visible={showPdfViewer}
          animationType="slide"
          onRequestClose={() => setShowPdfViewer(false)}
        >
          <View style={styles.pdfViewerContainer}>
            <View style={styles.pdfHeader}>
              <TouchableOpacity
                style={styles.pdfBackBtn}
                onPress={() => setShowPdfViewer(false)}
              >
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfTitle} numberOfLines={1}>
                  {selectedBook?.title}
                </Text>
                <Text style={styles.pdfAuthor}>by {selectedBook?.author}</Text>
              </View>
              <TouchableOpacity
                style={styles.pdfDownloadBtn}
                onPress={() => handleDownload(selectedBook)}
              >
                <Feather name="download" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.pdfContent}>
              {selectedBook?.pdfUrl ? (
                <>
                  <Pdf
                    trustAllCerts={false}
                    source={{ uri: selectedBook.pdfUrl, cache: true }}
                    onLoadComplete={(numberOfPages) => {
                      setTotalPages(numberOfPages);
                      console.log(`PDF loaded with ${numberOfPages} pages`);
                    }}
                    onPageChanged={(page) => {
                      setPdfPage(page);
                    }}
                    onError={(error) => {
                      console.log('PDF Error:', error);
                      Alert.alert('Error', 'Failed to load PDF');
                    }}
                    onPressLink={(uri) => {
                      console.log(`Link pressed: ${uri}`);
                    }}
                    style={styles.pdf}
                    enablePaging={true}
                    spacing={10}
                    horizontal={false}
                  />

                  {/* Page Counter */}
                  <View style={styles.pageCounter}>
                    <Text style={styles.pageCounterText}>
                      Page {pdfPage} of {totalPages}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.pdfPlaceholderContainer}>
                  <Text style={styles.pdfPlaceholder}>📄</Text>
                  <Text style={styles.pdfText}>PDF Not Available</Text>
                  <Text style={styles.pdfSubtext}>
                    The PDF file could not be loaded
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Layout>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.dark,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: colors.white,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
  },
  activeTabLabel: {
    color: colors.white,
  },
  countBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
  },
  activeCountText: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bookCard: {
    width: '48%',
    // flex:1,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  tag: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
  },
  freeTag: {
    backgroundColor: colors.success,
  },
  premiumTag: {
    backgroundColor: colors.warning,
  },
  tagText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  purchasedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    zIndex: 10,
  },
  purchasedText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  bookImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
  },
  bookContent: {
    padding: 12,
  },
  examBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  examText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E65100',
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 4,
    lineHeight: 20,
    height: 40,
  },
  bookAuthor: {
    fontSize: 11,
    color: colors.gray,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dark,
  },
  statSubText: {
    fontSize: 9,
    color: colors.gray,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  priceRow: {
    flexDirection: 'column',
  },
  originalPrice: {
    fontSize: 10,
    color: colors.gray,
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  discountBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    // paddingTop: 16,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 16,
  },
  modalImage: {
    width: '100%',
    // height: 250,
    backgroundColor: colors.border,
  },
  modalBody: {
    padding: 20,
  },
  modalExamBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  modalExamText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E65100',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 8,
    lineHeight: 30,
  },
  modalAuthor: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 16,
  },
  modalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalStatText: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.gray,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.dark,
  },
  modalPriceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  modalOriginalPrice: {
    fontSize: 14,
    color: colors.gray,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  modalDiscountPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.success,
  },
  modalDiscountBadge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalDiscountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalViewBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primaryDark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalBuyBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  paymentModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
  },
  orderSummary: {
    backgroundColor: colors.lightGray,
    padding: 16,
    margin: 20,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.gray,
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.dark,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  formGroup: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.dark,
  },
  formRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  payBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    gap: 10,
  },
  payBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  secureText: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
  },
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  pdfBackBtn: {
    padding: 8,
  },
  pdfTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  pdfAuthor: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  pdfDownloadBtn: {
    padding: 8,
  },
  pdfContent: {
    flex: 1,
    backgroundColor: colors.white,
  },
  pdf: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#f4f4f4',
  },
  pageCounter: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pageCounterText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: 10,
  },
  pdfPlaceholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pdfPlaceholder: {
    fontSize: 80,
    marginBottom: 20,
  },
  pdfText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: 8,
  },
  pdfSubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  pdfInfo: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 32,
  },
  pdfInfoText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '600',
  },
  openPdfBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  openPdfText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
});