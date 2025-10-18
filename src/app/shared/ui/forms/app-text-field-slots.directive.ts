import { Directive, TemplateRef, inject } from '@angular/core';

@Directive({
  selector: '[appTextFieldPrefix]',
  standalone: true,
})
export class AppTextFieldPrefixDirective {}

@Directive({
  selector: '[appTextFieldSuffix]',
  standalone: true,
})
export class AppTextFieldSuffixDirective {}

@Directive({
  selector: '[appTextFieldHint]',
  standalone: true,
})
export class AppTextFieldHintDirective {}

@Directive({
  selector: '[appTextFieldError]',
  standalone: true,
})
export class AppTextFieldErrorDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}
