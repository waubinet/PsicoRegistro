// Impede a janela de console no Windows — sempre, inclusive em builds de
// desenvolvimento (o instalador distribuído usa o perfil dev por causa do
// Smart App Control, e o console não deve aparecer para o usuário final).
#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

fn main() {
    psicoregistro_lib::run()
}
