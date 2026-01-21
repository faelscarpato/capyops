import type * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'fluent-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        appearance?: string;
        disabled?: boolean;
        type?: string;
      };
      'fluent-checkbox': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        checked?: boolean;
        disabled?: boolean;
      };
      'fluent-message-bar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        intent?: string;
        layout?: string;
      };
      'fluent-progress-bar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: number;
        max?: number;
      };
      'fluent-dropdown': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string;
        disabled?: boolean;
        placeholder?: string;
      };
      'fluent-listbox': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'fluent-option': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        value?: string;
        selected?: boolean;
      };
      'fluent-text-input': React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      > & {
        appearance?: string;
        'control-size'?: string;
      };
      'fluent-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        checked?: boolean;
        disabled?: boolean;
      };
    }
  }
}

export {};
