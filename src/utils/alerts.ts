import Swal from "sweetalert2";

const baseStyles = {
  confirmButtonColor: "#334155",
  cancelButtonColor: "#ef4444",
  customClass: {
    popup: "rounded-xl",
  },
};

export function alertSuccess(title: string, text?: string) {
  return Swal.fire({
    icon: "success",
    title,
    text,
    ...baseStyles,
    timer: 2000,
    showConfirmButton: false,
  });
}

export function alertError(title: string, text?: string) {
  return Swal.fire({
    icon: "error",
    title,
    text,
    ...baseStyles,
  });
}

export function alertWarning(title: string, text?: string) {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    ...baseStyles,
  });
}

export async function confirmAction(
  title: string,
  text: string,
  confirmText = "Sí, continuar",
  icon: "warning" | "question" = "warning"
): Promise<boolean> {
  const result = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancelar",
    ...baseStyles,
    reverseButtons: true,
  });
  return result.isConfirmed;
}
