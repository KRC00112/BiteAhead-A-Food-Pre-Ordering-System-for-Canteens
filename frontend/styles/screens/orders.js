// styles/orders.js
import { StyleSheet } from 'react-native';

const orders = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  heading: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderStyle: 'solid',
    borderWidth: 3,
    borderRadius: 2,
    boxShadow: '5px 5px rgba(0, 0, 0, 1)',
    marginBottom: 14,
    marginEnd: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 2,
  },
  orderId: {
    fontWeight: '900',
    fontSize: 18,
  },
  statusBadge: {
    borderWidth: 2,
    borderRadius: 2,
    paddingVertical: 2,
    paddingHorizontal: 8,
    boxShadow: '1px 2px rgba(0, 0, 0)',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  label: {
    color: '#555',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 2,
  },
  totalText: {
    fontWeight: '900',
    fontSize: 22,
  },
  ordersButtons: {
    backgroundColor: '#EA9999',
    borderTopWidth: 2,
    padding: 10,
    alignItems: 'center',
  },
  ordersButtonsText: {
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cancelButton: {
    backgroundColor: '#EA9999',
    borderTopWidth: 2,
    padding: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  feedbackButton: {
    backgroundColor: '#9FC5E8',
    borderTopWidth: 2,
    padding: 10,
    alignItems: 'center',
  },
  feedbackButtonText: {
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  feedbackForm: {
    maxHeight: '90%',
    backgroundColor: '#FFF8E7',
    borderWidth: 3,
    borderColor: '#111111',
    padding: 16,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  feedbackOrder: {
    marginBottom: 12,
  },
  feedbackItemsScroll: {
    flexShrink: 1,
  },
  feedbackActions: {
    flexShrink: 0,
  },
  feedbackItem: {
    borderTopWidth: 2,
    paddingVertical: 12,
    gap: 6,
  },
  feedbackFood: {
    fontSize: 18,
    fontWeight: '900',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    borderWidth: 2,
    borderColor: '#111111',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  ratingButtonSelected: {
    backgroundColor: '#FFD966',
  },
  clearRatingButton: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  clearRatingText: {
    color: '#7048E8',
    textDecorationLine: 'underline',
  },
  feedbackInput: {
    minHeight: 80,
    borderWidth: 2,
    borderColor: '#111111',
    padding: 8,
    textAlignVertical: 'top',
  },
  submitFeedbackButton: {
    backgroundColor: '#B6D7A8',
    borderWidth: 2,
    borderColor: '#111111',
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitFeedbackText: {
    fontWeight: '900',
  },
  closeFeedbackButton: {
    alignItems: 'center',
    padding: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});

export default orders;