import { useForm, Controller } from "react-hook-form";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Save } from "lucide-react";
import InputMask from "react-input-mask";

export default function SupplierForm({ supplier, onSubmit, onCancel }) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: supplier || {
      company_name: "",
      contact_name: "",
      email: "",
      phone: "",
      address: ""
    }
  });

  const onFormSubmit = async (data) => {
    await onSubmit(data);
  };

  const companyName = watch("company_name");
  const contactName = watch("contact_name");
  const emailValue = watch("email");
  const phoneValue = watch("phone");

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {supplier ? "Edit Supplier" : "Add New Supplier"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Company Name {!companyName && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="company_name"
                {...register("company_name", {
                  required: "Company name is required",
                  minLength: {
                    value: 2,
                    message: "Company name must be at least 2 characters"
                  }
                })}
                placeholder="Enter company name"
                className={errors.company_name ? "border-red-500" : ""}
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">
                Contact Name {!contactName && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="contact_name"
                {...register("contact_name", {
                  required: "Contact name is required",
                  minLength: {
                    value: 2,
                    message: "Contact name must be at least 2 characters"
                  }
                })}
                placeholder="Enter contact person name"
                className={errors.contact_name ? "border-red-500" : ""}
              />
              {errors.contact_name && (
                <p className="text-sm text-red-500">{errors.contact_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email {!emailValue && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  })}
                  placeholder="contact@company.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone {!phoneValue && <span className="text-red-500">*</span>}
                </Label>

                <Controller
                  name="phone"
                  control={control}
                  rules={{
                    required: "Phone number is required",
                    pattern: {
                      value: /^[0-9() -]*$/,
                      message: "Enter valid phone number",
                    },
                  }}
                  render={({ field }) => (
                    <InputMask
                      mask="(999) 999-9999"
                      value={field.value}
                      onChange={field.onChange}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("Text");
                        const digits = pasted.replace(/\D/g, "").slice(0, 10);
                        let formatted = digits;
                        if (digits.length > 6) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                        } else if (digits.length > 3) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                        } else {
                          formatted = digits;
                        }

                        field.onChange(formatted);
                      }}
                    >
                      {(inputProps) => (
                        <Input
                          {...inputProps}
                          id="phone"
                          type="tel"
                          placeholder="(999) 999-9999"
                          className={errors.phone ? "border-red-500" : ""}
                        />
                      )}
                    </InputMask>
                  )}
                />

                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">
                Address
              </Label>
              <Input
                id="address"
                {...register("address", {
                  minLength: {
                    value: 5,
                    message: "Address must be at least 5 characters"
                  }
                })}
                placeholder="Enter full address"
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(onFormSubmit)}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Saving..." : supplier ? "Update Supplier" : "Add Supplier"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}