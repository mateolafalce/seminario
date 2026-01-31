from manim import *
from manim_slides import Slide

config.background_color = WHITE

class MatcheoAlgorithm(Slide):
    def construct(self):
        # Configuración de colores
        self.title_color = "#1a1a1a"
        self.text_color = "#2c3e50"
        self.formula_color = "#34495e"
        self.highlight_color = "#e74c3c"
        self.accent_color = "#3498db"
        self.success_color = "#27ae60"
        
        # Slide 1: Introducción
        self.intro_slide()
        
        # Slide 2: Función de Similitud
        self.similarity_slide()
        
        # Slide 3: Función de Historial
        self.history_slide()
        
        # Slide 4: Función Combinada
        self.combined_slide()
        
        # Slide 5: Top X Ranking
        self.ranking_slide()
        
        # Slide 6: Optimización
        self.optimization_slide()
        
        # Slide 7: Backpropagation
        self.backprop_slide()
        
        # Slide 8: Conclusión
        self.conclusion_slide()
    
    def intro_slide(self):
        """Introducción al problema de matcheo"""
        title = Text("Algoritmo de Matcheo", font_size=56, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        subtitle = Text(
            "Encontrando los mejores compañeros de juego",
            font_size=32,
            color=self.text_color
        )
        subtitle.next_to(title, DOWN, buff=0.4)
        
        # Descripción
        desc = VGroup(
            Text("Dados 2 usuarios i y j:", font_size=32, color=self.text_color, weight=BOLD),
            Text("• Preferencias (días, horarios, canchas, categoría)", font_size=28, color=self.text_color),
            Text("• Historial de juego entre sí", font_size=28, color=self.text_color),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.4)
        desc.next_to(subtitle, DOWN, buff=1.2)
        
        self.play(Write(title), run_time=1)
        self.play(FadeIn(subtitle), run_time=0.8)
        self.play(FadeIn(desc, shift=UP), run_time=1)
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def similarity_slide(self):
        """Explicación de la función de similitud"""
        title = Text("Similitud de Preferencias", font_size=48, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        # Fórmula principal
        formula = MathTex(
            r"S(i,j) = 1 - \frac{d(i,j)}{d_{\max}}",
            font_size=52,
            color=self.formula_color
        )
        formula.next_to(title, DOWN, buff=0.8)
        
        # Explicación
        explanation = VGroup(
            Text("Donde:", font_size=28, color=self.text_color, weight=BOLD),
            MathTex(r"d(i,j)", color=self.accent_color, font_size=32),
            Text("= distancia euclidiana entre preferencias", font_size=24, color=self.text_color),
            MathTex(r"d_{\max}", color=self.accent_color, font_size=32),
            Text("= distancia máxima posible", font_size=24, color=self.text_color),
        )
        
        explanation[0].next_to(formula, DOWN, buff=0.8).to_edge(LEFT, buff=1)
        explanation[1].next_to(explanation[0], DOWN, buff=0.4, aligned_edge=LEFT).shift(RIGHT*0.5)
        explanation[2].next_to(explanation[1], RIGHT, buff=0.3)
        explanation[3].next_to(explanation[1], DOWN, buff=0.4, aligned_edge=LEFT)
        explanation[4].next_to(explanation[3], RIGHT, buff=0.3)
        
        # Visualización de espacio 4D
        dimensions = VGroup(
            Text("📅 Días", font_size=24, color=self.text_color),
            Text("🕐 Horarios", font_size=24, color=self.text_color),
            Text("🎾 Canchas", font_size=24, color=self.text_color),
            Text("⭐ Categoría", font_size=24, color=self.text_color),
        ).arrange(RIGHT, buff=0.6)
        dimensions.to_edge(DOWN, buff=0.8)
        
        box = SurroundingRectangle(dimensions, color=self.accent_color, buff=0.3, corner_radius=0.2)
        dim_group = VGroup(box, dimensions)
        
        
        self.play(Write(title), run_time=1)
        self.play(Write(formula), run_time=1.5)
        self.play(FadeIn(explanation[0]), run_time=0.5)
        self.play(
            Write(explanation[1]),
            FadeIn(explanation[2], shift=RIGHT),
            run_time=1
        )
        self.play(
            Write(explanation[3]),
            FadeIn(explanation[4], shift=RIGHT),
            run_time=1
        )
        self.play(Create(box), FadeIn(dimensions), run_time=1)
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def history_slide(self):
        """Explicación de la función de historial"""
        title = Text("Historial de Juego", font_size=48, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        # Fórmula principal
        formula = MathTex(
            r"J(i,j) = \frac{g(i,j)}{g(i)}",
            font_size=52,
            color=self.formula_color
        )
        formula.next_to(title, DOWN, buff=0.8)
        
        # Explicación
        explanation = VGroup(
            Text("Donde:", font_size=28, color=self.text_color, weight=BOLD),
            MathTex(r"g(i,j)", color=self.accent_color, font_size=32),
            Text("= partidos jugados entre i y j", font_size=24, color=self.text_color),
            MathTex(r"g(i)", color=self.accent_color, font_size=32),
            Text("= total de partidos jugados por i", font_size=24, color=self.text_color),
        )
        
        explanation[0].next_to(formula, DOWN, buff=0.8).to_edge(LEFT, buff=1)
        explanation[1].next_to(explanation[0], DOWN, buff=0.4, aligned_edge=LEFT).shift(RIGHT*0.5)
        explanation[2].next_to(explanation[1], RIGHT, buff=0.3)
        explanation[3].next_to(explanation[1], DOWN, buff=0.4, aligned_edge=LEFT)
        explanation[4].next_to(explanation[3], RIGHT, buff=0.3)
        
        self.play(Write(title), run_time=1)
        self.play(Write(formula), run_time=1.5)
        self.play(FadeIn(explanation[0]), run_time=0.5)
        self.play(
            Write(explanation[1]),
            FadeIn(explanation[2], shift=RIGHT),
            run_time=1
        )
        self.play(
            Write(explanation[3]),
            FadeIn(explanation[4], shift=RIGHT),
            run_time=1
        )
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def combined_slide(self):
        """Función combinada A(i,j)"""
        title = Text("Función de Matcheo", font_size=48, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        # Fórmula principal
        formula = MathTex(
            r"A(i,j) = \alpha \times S(i,j) + \beta \times J(i,j)",
            font_size=48,
            color=self.formula_color
        )
        formula.next_to(title, DOWN, buff=0.8)
        
        # Restricción
        constraint = MathTex(
            r"\alpha + \beta = 1",
            font_size=40,
            color=self.highlight_color
        )
        constraint.next_to(formula, DOWN, buff=0.6)
        
        # Explicación de pesos
        weights_title = Text("Pesos de balance:", font_size=28, color=self.text_color, weight=BOLD)
        weights_title.next_to(constraint, DOWN, buff=0.8).to_edge(LEFT, buff=1)
        
        weights = VGroup(
            MathTex(r"\alpha", color=self.accent_color, font_size=32),
            Text("= importancia de preferencias", font_size=24, color=self.text_color),
            MathTex(r"\beta", color=self.accent_color, font_size=32),
            Text("= importancia del historial", font_size=24, color=self.text_color),
        )
        
        weights[0].next_to(weights_title, DOWN, buff=0.4, aligned_edge=LEFT).shift(RIGHT*0.5)
        weights[1].next_to(weights[0], RIGHT, buff=0.3)
        weights[2].next_to(weights[0], DOWN, buff=0.4, aligned_edge=LEFT)
        weights[3].next_to(weights[2], RIGHT, buff=0.3)
        
        # Valor inicial
        initial = MathTex(
            r"\text{Inicial: } \alpha = \beta = 0.5",
            font_size=36,
            color=self.success_color
        )
        initial.next_to(weights[3], DOWN, buff=0.8)
        
        self.play(Write(title), run_time=1)
        self.play(Write(formula), run_time=1.5)
        self.play(Write(constraint), run_time=1)
        self.play(Write(weights_title), run_time=0.5)
        self.play(
            Write(weights[0]),
            FadeIn(weights[1], shift=RIGHT),
            run_time=1
        )
        self.play(
            Write(weights[2]),
            FadeIn(weights[3], shift=RIGHT),
            run_time=1
        )
        self.play(Write(initial), run_time=1)
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def ranking_slide(self):
        """Top X ranking"""
        title = Text("Selección Top X", font_size=48, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        # Fórmula
        formula = MathTex(
            r"P_{\text{topx}} = \{(i,j) \in P \mid A(i,j) \geq v_{\text{topx}}\}",
            font_size=40,
            color=self.formula_color
        )
        formula.next_to(title, DOWN, buff=0.8)
        
        # Lista ordenada
        ordered_title = Text("Lista ordenada de valores:", font_size=28, color=self.text_color, weight=BOLD)
        ordered_title.next_to(formula, DOWN, buff=0.8)
        
        ordered_list = MathTex(
            r"V' = (v_1, v_2, v_3, \ldots, v_N)",
            font_size=36,
            color=self.text_color
        )
        ordered_list.next_to(ordered_title, DOWN, buff=0.4)
        
        condition = MathTex(
            r"v_1 \geq v_2 \geq v_3 \geq \ldots \geq v_N",
            font_size=36,
            color=self.text_color
        )
        condition.next_to(ordered_list, DOWN, buff=0.4)
        
        self.play(Write(title), run_time=1)
        self.play(Write(formula), run_time=1.5)
        self.play(Write(ordered_title), run_time=0.5)
        self.play(Write(ordered_list), run_time=1)
        self.play(Write(condition), run_time=1)
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def optimization_slide(self):
        """Optimización con aprendizaje"""
        title = Text("Aprendizaje Inteligente", font_size=48, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        subtitle = Text(
            "Ajustando los pesos α y β con datos reales",
            font_size=28,
            color=self.text_color
        )
        subtitle.next_to(title, DOWN, buff=0.4)
        
        # Función de pérdida
        loss_title = Text("Función de Pérdida (MSE):", font_size=32, color=self.text_color, weight=BOLD)
        loss_title.next_to(subtitle, DOWN, buff=0.8)
        
        loss_formula = MathTex(
            r"L(\beta) = \sum_{(i,j)} (A(i,j) - y_{ij})^2",
            font_size=44,
            color=self.formula_color
        )
        loss_formula.next_to(loss_title, DOWN, buff=0.5)
        
        # Expandida
        loss_expanded = MathTex(
            r"= \sum_{(i,j)} \left((1-\beta) S(i,j) + \beta J(i,j) - y_{ij}\right)^2",
            font_size=36,
            color=self.formula_color
        )
        loss_expanded.next_to(loss_formula, DOWN, buff=0.3)
        
        # Etiquetas (sin título para ahorrar espacio)
        labels = VGroup(
            MathTex(r"y_{ij} = 1", color=self.success_color, font_size=32),
            Text("→ jugaron juntos", font_size=24, color=self.text_color),
            MathTex(r"y_{ij} = 0", color=self.highlight_color, font_size=32),
            Text("→ no jugaron juntos", font_size=24, color=self.text_color),
        )
        
        labels[0].next_to(loss_expanded, DOWN, buff=0.8, aligned_edge=LEFT).shift(RIGHT*0.5)
        labels[1].next_to(labels[0], RIGHT, buff=0.3)
        labels[2].next_to(labels[0], DOWN, buff=0.4, aligned_edge=LEFT)
        labels[3].next_to(labels[2], RIGHT, buff=0.3)
        
        # Objetivo
        objective = Text(
            "Objetivo: Minimizar L respecto a β",
            font_size=32,
            color=self.highlight_color,
            weight=BOLD
        )
        objective.next_to(labels[3], DOWN, buff=0.8)
        
        self.play(Write(title), run_time=1)
        self.play(FadeIn(subtitle), run_time=0.8)
        self.play(Write(loss_title), run_time=0.5)
        self.play(Write(loss_formula), run_time=1.5)
        self.play(Write(loss_expanded), run_time=1.5)
        self.play(
            Write(labels[0]),
            FadeIn(labels[1], shift=RIGHT),
            run_time=1
        )
        self.play(
            Write(labels[2]),
            FadeIn(labels[3], shift=RIGHT),
            run_time=1
        )
        self.play(Write(objective), run_time=1)
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def backprop_slide(self):
        """Backpropagation"""
        title = Text("Backpropagation", font_size=48, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        # Gradiente
        gradient_title = Text("1. Calcular Gradiente:", font_size=28, color=self.text_color, weight=BOLD)
        gradient_title.next_to(title, DOWN, buff=0.6)
        
        gradient = MathTex(
            r"\frac{\partial L}{\partial \beta} = 2 \sum_{(i,j)} \left((1-\beta) S(i,j) + \beta J(i,j) - y_{ij}\right) \left(J(i,j) - S(i,j)\right)",
            font_size=24,
            color=self.formula_color
        )
        gradient.next_to(gradient_title, DOWN, buff=0.4)
        
        # Actualización
        update_title = Text("2. Actualizar Peso:", font_size=28, color=self.text_color, weight=BOLD)
        update_title.next_to(gradient, DOWN, buff=0.6)
        
        update = MathTex(
            r"\beta \leftarrow \beta - \eta \frac{\partial L}{\partial \beta}",
            font_size=44,
            color=self.formula_color
        )
        update.next_to(update_title, DOWN, buff=0.4)
        
        # Learning rate
        lr_text = MathTex(
            r"\eta = \text{learning rate}",
            font_size=28,
            color=self.accent_color
        )
        lr_text.next_to(update, DOWN, buff=0.4)
        
        # Alpha
        alpha_title = Text("3. Actualizar α:", font_size=28, color=self.text_color, weight=BOLD)
        alpha_title.next_to(lr_text, DOWN, buff=0.6)
        
        alpha_update = MathTex(
            r"\alpha \leftarrow 1 - \beta",
            font_size=40,
            color=self.formula_color
        )
        alpha_update.next_to(alpha_title, DOWN, buff=0.4)
        
        # Iteración
        iteration = Text(
            "Repetir hasta convergencia",
            font_size=24,
            color=self.highlight_color,
            weight=BOLD,
            slant=ITALIC
        )
        iteration.next_to(alpha_update, DOWN, buff=0.6)
        
        self.play(Write(title), run_time=1)
        self.play(Write(gradient_title), run_time=0.5)
        self.play(Write(gradient), run_time=2)
        self.play(Write(update_title), run_time=0.5)
        self.play(Write(update), run_time=1.5)
        self.play(Write(lr_text), run_time=0.8)
        self.play(Write(alpha_title), run_time=0.5)
        self.play(Write(alpha_update), run_time=1.5)
        self.play(Write(iteration), run_time=1)
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
    
    def conclusion_slide(self):
        """Conclusión"""
        title = Text("Algoritmo Completo", font_size=48, color=self.title_color, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        
        # Resumen
        summary = VGroup(
            Text("✓ Similitud de preferencias (S)", font_size=28, color=self.text_color),
            Text("✓ Historial de juego (J)", font_size=28, color=self.text_color),
            Text("✓ Función combinada (A)", font_size=28, color=self.text_color),
            Text("✓ Optimización con backpropagation", font_size=28, color=self.text_color),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.4)
        summary.next_to(title, DOWN, buff=1)
        
        # Mensaje final
        final = Text(
            "¡Aprendizaje automático para mejores matcheos!",
            font_size=36,
            color=self.success_color,
            weight=BOLD
        )
        final.next_to(summary, DOWN, buff=1.5)
        
        self.play(Write(title), run_time=1)
        self.play(
            LaggedStart(*[FadeIn(item, shift=RIGHT) for item in summary], lag_ratio=0.3),
            run_time=2.5
        )
        self.play(Write(final), run_time=1.5)
        
        self.next_slide()
        self.play(*[FadeOut(mob) for mob in self.mobjects])
