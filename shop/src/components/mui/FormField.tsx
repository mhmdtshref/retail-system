"use client";
import * as React from 'react';
import { Controller, ControllerProps, FieldValues } from 'react-hook-form';
import { TextField, TextFieldProps } from '@mui/material';

export type FormFieldProps<TFieldValues extends FieldValues> = Omit<ControllerProps<TFieldValues>, 'render'> & {
  textFieldProps?: TextFieldProps;
  label?: React.ReactNode;
  helper?: React.ReactNode;
  type?: TextFieldProps['type'];
};

export function FormField<TFieldValues extends FieldValues>({
  name,
  control,
  defaultValue,
  rules,
  shouldUnregister,
  label,
  helper,
  textFieldProps,
  type,
}: FormFieldProps<TFieldValues>) {
  return (
    <Controller
      name={name as any}
      control={control}
      defaultValue={defaultValue as any}
      rules={rules}
      shouldUnregister={shouldUnregister}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          type={type}
          label={label as any}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || helper}
          {...textFieldProps}
        />
      )}
    />
  );
}
