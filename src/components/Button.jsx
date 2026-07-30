function Button({ children, secondary = false, onClick }) {
  return (
    <button
      type="button"
      className={secondary ? "secondary-button" : "primary-button"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;