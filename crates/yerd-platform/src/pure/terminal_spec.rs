//! Working-directory flags for the terminal emulators we know how to launch.
//!
//! Pure: a program name goes in, the flags that point that terminal at a
//! directory come out. The Linux impl owns the spawning.
//!
//! Lookups match on the program's file name, not the whole string: KDE stores
//! `TerminalApplication` in `kdeglobals` as either a bare name (`konsole`) or an
//! absolute path (`/usr/bin/konsole`), and both must resolve to the same flags
//! or the terminal opens in the wrong directory.

use std::path::Path;

/// Programs we probe for, in order, paired with the flags that set the working
/// directory. The directory itself is appended by the caller.
pub const TERMINAL_SPECS: &[(&str, &[&str])] = &[
    ("x-terminal-emulator", &["--working-directory"]),
    ("gnome-terminal", &["--working-directory"]),
    ("konsole", &["--workdir"]),
    ("xfce4-terminal", &["--working-directory"]),
    ("kitty", &["--directory"]),
    ("alacritty", &["--working-directory"]),
    ("wezterm", &["start", "--cwd"]),
];

/// Flags that point `program` at a working directory, or `None` for a program
/// we don't recognise (the caller then relies on the spawned child inheriting
/// the current directory).
#[must_use]
pub fn working_dir_flags(program: &str) -> Option<&'static [&'static str]> {
    let name = Path::new(program)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(program);
    TERMINAL_SPECS
        .iter()
        .find(|(candidate, _)| *candidate == name)
        .map(|(_, flags)| *flags)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_programs_map_to_their_flags() {
        let cases = [
            ("konsole", Some(&["--workdir"][..])),
            ("gnome-terminal", Some(&["--working-directory"][..])),
            ("kitty", Some(&["--directory"][..])),
            ("alacritty", Some(&["--working-directory"][..])),
            ("xfce4-terminal", Some(&["--working-directory"][..])),
            ("x-terminal-emulator", Some(&["--working-directory"][..])),
            ("wezterm", Some(&["start", "--cwd"][..])),
            ("xterm", None),
            ("", None),
        ];
        for (program, expected) in cases {
            assert_eq!(working_dir_flags(program), expected, "program: {program}");
        }
    }

    #[test]
    fn absolute_paths_match_on_the_file_name() {
        let cases = [
            ("/usr/bin/konsole", Some(&["--workdir"][..])),
            ("/opt/kitty/bin/kitty", Some(&["--directory"][..])),
            ("/usr/local/bin/xterm", None),
        ];
        for (program, expected) in cases {
            assert_eq!(working_dir_flags(program), expected, "program: {program}");
        }
    }

    #[test]
    fn every_spec_resolves_to_its_own_flags() {
        for (program, flags) in TERMINAL_SPECS {
            assert_eq!(working_dir_flags(program), Some(*flags));
        }
    }
}
