import { Modal, Listbox, Checkbox } from "@shopify/polaris";

function ProductSelectionModal({ 
  modalActive, 
  toggleModal, 
  products, 
  selectedProducts, 
  handleSelectProduct, 
  handleConfirmSelection 
}) {
  return (
    <Modal
      open={modalActive}
      onClose={toggleModal}
      title="Select Products"
      primaryAction={{
        content: "Confirm",
        onAction: handleConfirmSelection,
      }}
      secondaryActions={{
        content: "Cancel",
        onAction: toggleModal,
      }}
    >
      <Modal.Section>
        <Listbox>
          {products.map((product) => (
            <Listbox.Option
              key={product.id}
              value={product.id}
              selected={selectedProducts.includes(product.id)}
              onClick={() => handleSelectProduct(product.id)}
            >
              <Checkbox
                label={product.title}
                checked={selectedProducts.includes(product.id)}
                onChange={() => handleSelectProduct(product.id)}
              />
            </Listbox.Option>
          ))}
        </Listbox>
      </Modal.Section>
    </Modal>
  );
}

export default ProductSelectionModal;